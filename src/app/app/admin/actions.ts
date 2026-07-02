"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

function parseAmount(value: string, fieldName: string) {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    redirect(`/app/admin?error=${encodeURIComponent(`${fieldName} invalido`)}`);
  }
  return amount;
}

type ParsedImportRow = {
  rowNumber: number;
  fullName: string;
  businessUnitName: string;
  areaName: string;
  position: string;
  contractType: string;
  status: string;
  identificationNumber: string;
  salaryRaw: string;
};

const REQUIRED_IMPORT_HEADERS = [
  "full_name",
  "business_unit_name",
  "position",
  "contract_type",
  "status",
] as const;

const IMPORT_HEADER_ALIASES: Record<string, string> = {
  nombre: "full_name",
  nombre_completo: "full_name",
  full_name: "full_name",
  unidad: "business_unit_name",
  unidad_negocio: "business_unit_name",
  business_unit: "business_unit_name",
  business_unit_name: "business_unit_name",
  area: "area_name",
  area_name: "area_name",
  cargo: "position",
  position: "position",
  estado: "status",
  status: "status",
  tipo_contrato: "contract_type",
  contract_type: "contract_type",
  documento: "identification_number",
  identification_number: "identification_number",
  salario: "salary",
  salary: "salary",
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "activo" || normalized === "active") return "activo";
  if (normalized === "inactivo" || normalized === "inactive") return "inactivo";
  return value.trim();
}

function normalizeContract(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "SIPE" || normalized === "SP") return normalized;
  return value.trim();
}

function normalizeIdentity(value: string) {
  return value.trim().toLowerCase();
}

function normalizeNameKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseEmployeesCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [] as ParsedImportRow[], missingHeaders: [...REQUIRED_IMPORT_HEADERS] as string[] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const canonicalHeaders = rawHeaders.map(
    (header) => IMPORT_HEADER_ALIASES[normalizeHeader(header)] ?? normalizeHeader(header)
  );
  const headerIndex = new Map(canonicalHeaders.map((header, index) => [header, index]));
  const missingHeaders = REQUIRED_IMPORT_HEADERS.filter((header) => !headerIndex.has(header));

  const rows: ParsedImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const getValue = (header: string) => {
      const index = headerIndex.get(header);
      if (index === undefined) return "";
      return String(values[index] ?? "").trim();
    };

    rows.push({
      rowNumber: lineIndex + 1,
      fullName: getValue("full_name"),
      businessUnitName: getValue("business_unit_name"),
      areaName: getValue("area_name"),
      position: getValue("position"),
      contractType: normalizeContract(getValue("contract_type")),
      status: normalizeStatus(getValue("status")),
      identificationNumber: getValue("identification_number"),
      salaryRaw: getValue("salary"),
    });
  }

  return { rows, missingHeaders };
}

export async function importEmployeesCsv(formData: FormData) {
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/app/") ? returnToRaw : "/app/admin";
  const returnBasePath = returnTo.split("?")[0] || "/app/admin";
  const errorRedirect = (message: string) => {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}error=${encodeURIComponent(message)}`);
  };

  const csvData = String(formData.get("csvData") ?? "").trim();
  if (!csvData) {
    errorRedirect("Debes proporcionar un CSV para importar");
  }

  const supabase = createClient();
  const { rows, missingHeaders } = parseEmployeesCsv(csvData);

  if (missingHeaders.length > 0) {
    errorRedirect(`Faltan columnas requeridas: ${missingHeaders.join(", ")}`);
  }

  if (rows.length === 0) {
    errorRedirect("No se encontraron filas en el CSV");
  }

  const { data: businessUnits, error: businessUnitsError } = await supabase
    .from("business_units")
    .select("id,name");

  if (businessUnitsError) {
    errorRedirect(businessUnitsError.message);
  }

  const { data: areas, error: areasError } = await supabase
    .from("areas")
    .select("id,name,business_unit_id");

  if (areasError) {
    errorRedirect(areasError.message);
  }

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id,full_name,business_unit_id,identification_number");

  if (employeesError) {
    errorRedirect(employeesError.message);
  }

  const businessUnitsByName = new Map(
    (businessUnits ?? []).map((item) => [item.name.trim().toLowerCase(), item.id])
  );
  const areasByKey = new Map(
    (areas ?? []).map((item) => [
      `${item.business_unit_id}::${item.name.trim().toLowerCase()}`,
      item.id,
    ])
  );

  const employeesByIdentity = new Map<string, { id: string }>();
  const employeesByNameAndUnit = new Map<string, { id: string }>();

  for (const employee of employees ?? []) {
    if (employee.identification_number) {
      employeesByIdentity.set(normalizeIdentity(employee.identification_number), {
        id: employee.id,
      });
    }

    const key = `${normalizeNameKey(employee.full_name)}::${employee.business_unit_id}`;
    employeesByNameAndUnit.set(key, { id: employee.id });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const rowErrors: string[] = [];

  for (const row of rows) {
    const errors: string[] = [];

    if (!row.fullName) errors.push("full_name requerido");
    if (!row.businessUnitName) errors.push("business_unit_name requerido");
    if (!row.position) errors.push("position requerido");
    if (!row.contractType) errors.push("contract_type requerido");
    if (!row.status) errors.push("status requerido");

    if (row.contractType && row.contractType !== "SIPE" && row.contractType !== "SP") {
      errors.push("contract_type invalido (usa SIPE o SP)");
    }

    if (row.status && row.status !== "activo" && row.status !== "inactivo") {
      errors.push("status invalido (usa activo o inactivo)");
    }

    const businessUnitId = businessUnitsByName.get(row.businessUnitName.toLowerCase());
    if (!businessUnitId) {
      errors.push("unidad no existe");
    }

    let areaId: string | null = null;
    if (row.areaName && businessUnitId) {
      const key = `${businessUnitId}::${row.areaName.toLowerCase()}`;
      areaId = areasByKey.get(key) ?? null;
      if (!areaId) {
        errors.push("area no existe en la unidad");
      }
    }

    let salary: number | null = null;
    if (row.salaryRaw) {
      salary = Number(row.salaryRaw);
      if (Number.isNaN(salary)) {
        errors.push("salary invalido");
      }
    }

    if (errors.length > 0 || !businessUnitId) {
      skipped += 1;
      rowErrors.push(`Fila ${row.rowNumber}: ${errors.join(", ")}`);
      continue;
    }

    const normalizedIdentity = row.identificationNumber
      ? normalizeIdentity(row.identificationNumber)
      : "";
    const normalizedNameKey = `${normalizeNameKey(row.fullName)}::${businessUnitId}`;

    let existingEmployeeId = "";
    if (normalizedIdentity) {
      existingEmployeeId = employeesByIdentity.get(normalizedIdentity)?.id ?? "";
    }
    if (!existingEmployeeId) {
      existingEmployeeId = employeesByNameAndUnit.get(normalizedNameKey)?.id ?? "";
    }

    if (existingEmployeeId) {
      const { error } = await supabase
        .from("employees")
        .update({
          full_name: row.fullName,
          business_unit_id: businessUnitId,
          area_id: areaId,
          position: row.position,
          contract_type: row.contractType,
          status: row.status,
          identification_number: row.identificationNumber || null,
          salary,
        })
        .eq("id", existingEmployeeId);

      if (error) {
        skipped += 1;
        rowErrors.push(`Fila ${row.rowNumber}: ${error.message}`);
        continue;
      }

      updated += 1;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("employees")
      .insert({
        full_name: row.fullName,
        business_unit_id: businessUnitId,
        area_id: areaId,
        position: row.position,
        contract_type: row.contractType,
        status: row.status,
        identification_number: row.identificationNumber || null,
        salary,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      skipped += 1;
      rowErrors.push(`Fila ${row.rowNumber}: ${error?.message ?? "No se pudo insertar"}`);
      continue;
    }

    created += 1;

    if (normalizedIdentity) {
      employeesByIdentity.set(normalizedIdentity, { id: inserted.id });
    }
    employeesByNameAndUnit.set(normalizedNameKey, { id: inserted.id });
  }

  const report = {
    totalRows: rows.length,
    created,
    updated,
    skipped,
    errors: rowErrors.slice(0, 30),
  };

  const reportToken = Buffer.from(JSON.stringify(report), "utf8").toString("base64url");

  revalidatePath(returnBasePath);
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(
    `${returnTo}${separator}message=${encodeURIComponent(
      `Importacion finalizada. Creados: ${created}, actualizados: ${updated}, omitidos: ${skipped}`
    )}&importReport=${reportToken}`
  );
}

export async function createTipRecord(formData: FormData) {
  const profile = await bootstrapProfile();
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const shift = String(formData.get("shift") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!employeeId || !businessUnitId || !shift || !date || !amountRaw) {
    redirect("/app/admin?error=Completa+los+campos+obligatorios+de+propina");
  }

  const amount = parseAmount(amountRaw, "Monto de propina");

  const { error } = await supabase.from("tips_records").insert({
    employee_id: employeeId,
    business_unit_id: businessUnitId,
    shift,
    amount,
    date,
    notes: notes || null,
    registered_by: profile.id,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin?message=Propina+registrada");
}

export async function createPettyCashRecord(formData: FormData) {
  const supabase = createClient();

  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const responsible = String(formData.get("responsible") ?? "").trim();

  if (!businessUnitId || !category || !amountRaw || !date) {
    redirect("/app/admin?error=Completa+los+campos+obligatorios+de+caja+menuda");
  }

  const amount = parseAmount(amountRaw, "Monto de caja menuda");

  const { error } = await supabase.from("petty_cash_records").insert({
    business_unit_id: businessUnitId,
    category,
    amount,
    date,
    description: description || null,
    responsible: responsible || null,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin?message=Movimiento+de+caja+menuda+registrado");
}

export async function createTempStaffRecord(formData: FormData) {
  const supabase = createClient();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !businessUnitId || !eventType || !eventDate || !hourlyRateRaw) {
    redirect("/app/admin?error=Completa+los+campos+obligatorios+de+eventuales");
  }

  const hourlyRate = parseAmount(hourlyRateRaw, "Tarifa por hora");

  let hoursCalculated: number | null = null;
  let totalAmount: number | null = null;

  if (startTime && endTime) {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      redirect("/app/admin?error=Rango+de+hora+invalido+en+eventuales");
    }

    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    hoursCalculated = Math.round(diffHours * 100) / 100;
    totalAmount = Math.round(hoursCalculated * hourlyRate * 100) / 100;
  }

  const { error } = await supabase.from("temp_staff_records").insert({
    full_name: fullName,
    business_unit_id: businessUnitId,
    area_id: areaId || null,
    event_type: eventType,
    event_date: eventDate,
    start_time: startTime || null,
    end_time: endTime || null,
    hourly_rate: hourlyRate,
    hours_calculated: hoursCalculated,
    total_amount: totalAmount,
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin?message=Eventual+registrado");
}
