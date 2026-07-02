"use client";

import { useMemo, useState } from "react";

type CatalogItem = {
  id: string;
  name: string;
  business_unit_id?: string;
};

type PreviewRow = {
  rowNumber: number;
  fullName: string;
  businessUnitName: string;
  areaName: string;
  position: string;
  contractType: string;
  status: string;
  identificationNumber: string;
  salaryRaw: string;
  errors: string[];
};

type EmployeeCsvImporterProps = {
  businessUnits: CatalogItem[];
  areas: CatalogItem[];
  action: (formData: FormData) => void;
  returnTo?: string;
};

const REQUIRED_HEADERS = [
  "full_name",
  "business_unit_name",
  "position",
  "contract_type",
  "status",
] as const;

const HEADER_ALIASES: Record<string, string> = {
  "nombre": "full_name",
  "nombre_completo": "full_name",
  "full_name": "full_name",
  "unidad": "business_unit_name",
  "unidad_negocio": "business_unit_name",
  "business_unit": "business_unit_name",
  "business_unit_name": "business_unit_name",
  "area": "area_name",
  "area_name": "area_name",
  "cargo": "position",
  "position": "position",
  "estado": "status",
  "status": "status",
  "tipo_contrato": "contract_type",
  "contract_type": "contract_type",
  "documento": "identification_number",
  "identification_number": "identification_number",
  "salario": "salary",
  "salary": "salary",
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

function isExcelFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
}

async function fileToImportText(file: File) {
  if (isExcelFile(file)) {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return "";
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_csv(firstSheet, { blankrows: false });
  }

  return file.text();
}

function toCanonicalStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "activo" || normalized === "active") return "activo";
  if (normalized === "inactivo" || normalized === "inactive") return "inactivo";
  return value.trim();
}

function toCanonicalContract(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "SIPE" || normalized === "SP") return normalized;
  return value.trim();
}

function buildPreview(
  csvText: string,
  businessUnits: CatalogItem[],
  areas: CatalogItem[]
): {
  rows: PreviewRow[];
  missingHeaders: string[];
  validRows: number;
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], missingHeaders: [...REQUIRED_HEADERS], validRows: 0 };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const canonicalHeaders = rawHeaders.map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? normalizeHeader(header));
  const headerIndex = new Map(canonicalHeaders.map((header, index) => [header, index]));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerIndex.has(header));

  const businessUnitsByName = new Map(
    businessUnits.map((item) => [item.name.trim().toLowerCase(), item.id])
  );

  const areasByKey = new Map(
    areas.map((item) => [
      `${item.business_unit_id ?? ""}::${item.name.trim().toLowerCase()}`,
      item.id,
    ])
  );

  const rows: PreviewRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const getValue = (header: string) => {
      const index = headerIndex.get(header);
      if (index === undefined) return "";
      return String(values[index] ?? "").trim();
    };

    const fullName = getValue("full_name");
    const businessUnitName = getValue("business_unit_name");
    const areaName = getValue("area_name");
    const position = getValue("position");
    const contractType = toCanonicalContract(getValue("contract_type"));
    const status = toCanonicalStatus(getValue("status"));
    const identificationNumber = getValue("identification_number");
    const salaryRaw = getValue("salary");

    const errors: string[] = [];

    if (!fullName) errors.push("full_name requerido");
    if (!businessUnitName) errors.push("business_unit_name requerido");
    if (!position) errors.push("position requerido");
    if (!contractType) errors.push("contract_type requerido");
    if (!status) errors.push("status requerido");

    const businessUnitId = businessUnitsByName.get(businessUnitName.toLowerCase());
    if (businessUnitName && !businessUnitId) {
      errors.push("unidad no existe");
    }

    if (areaName && businessUnitId) {
      const areaKey = `${businessUnitId}::${areaName.toLowerCase()}`;
      if (!areasByKey.has(areaKey)) {
        errors.push("area no existe en la unidad");
      }
    }

    if (contractType && contractType !== "SIPE" && contractType !== "SP") {
      errors.push("contract_type debe ser SIPE o SP");
    }

    if (status && status !== "activo" && status !== "inactivo") {
      errors.push("status debe ser activo o inactivo");
    }

    if (salaryRaw && Number.isNaN(Number(salaryRaw))) {
      errors.push("salary invalido");
    }

    rows.push({
      rowNumber: lineIndex + 1,
      fullName,
      businessUnitName,
      areaName,
      position,
      contractType,
      status,
      identificationNumber,
      salaryRaw,
      errors,
    });
  }

  const validRows = rows.filter((row) => row.errors.length === 0).length;
  return { rows, missingHeaders, validRows };
}

export default function EmployeeCsvImporter({
  businessUnits,
  areas,
  action,
  returnTo,
}: EmployeeCsvImporterProps) {
  const [csvText, setCsvText] = useState("");

  const preview = useMemo(
    () => buildPreview(csvText, businessUnits, areas),
    [csvText, businessUnits, areas]
  );

  const hasPreview = preview.rows.length > 0;
  const invalidRows = preview.rows.length - preview.validRows;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Formato esperado (Excel)</p>
        <p className="mt-1">Columnas requeridas: full_name, business_unit_name, position, contract_type, status</p>
        <p>Columnas opcionales: area_name, identification_number, salary</p>
        <a
          href="/templates/empleados_import_template.xlsx"
          download
          className="mt-2 inline-block text-xs font-semibold text-slate-700 underline hover:text-slate-900"
        >
          Descargar plantilla Excel
        </a>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="employeeCsvFile">
          Cargar archivo Excel
        </label>
        <input
          id="employeeCsvFile"
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const text = await fileToImportText(file);
            setCsvText(text);
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="employeeCsvText">
          O pega el CSV aqui
        </label>
        <textarea
          id="employeeCsvText"
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="full_name,business_unit_name,position,contract_type,status,area_name,identification_number,salary"
        />
      </div>

      {preview.missingHeaders.length > 0 && csvText.trim() ? (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          Faltan columnas requeridas: {preview.missingHeaders.join(", ")}
        </p>
      ) : null}

      {hasPreview ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Vista previa</p>
          <p className="mt-1 text-xs text-slate-600">
            Filas validas: {preview.validRows} | Filas con errores: {invalidRows}
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 font-medium">Fila</th>
                  <th className="px-2 py-2 font-medium">Nombre</th>
                  <th className="px-2 py-2 font-medium">Unidad</th>
                  <th className="px-2 py-2 font-medium">Area</th>
                  <th className="px-2 py-2 font-medium">Cargo</th>
                  <th className="px-2 py-2 font-medium">Contrato</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Errores</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((row) => (
                  <tr key={row.rowNumber} className="border-b border-slate-100">
                    <td className="px-2 py-2 text-slate-700">{row.rowNumber}</td>
                    <td className="px-2 py-2 text-slate-900">{row.fullName || "-"}</td>
                    <td className="px-2 py-2 text-slate-700">{row.businessUnitName || "-"}</td>
                    <td className="px-2 py-2 text-slate-700">{row.areaName || "-"}</td>
                    <td className="px-2 py-2 text-slate-700">{row.position || "-"}</td>
                    <td className="px-2 py-2 text-slate-700">{row.contractType || "-"}</td>
                    <td className="px-2 py-2 text-slate-700">{row.status || "-"}</td>
                    <td className="px-2 py-2">
                      {row.errors.length === 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">OK</span>
                      ) : (
                        <span className="text-rose-700">{row.errors.join("; ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.rows.length > 20 ? (
            <p className="mt-2 text-xs text-slate-500">Mostrando 20 de {preview.rows.length} filas.</p>
          ) : null}
        </div>
      ) : null}

      <form action={action} className="pt-2">
        <input type="hidden" name="csvData" value={csvText} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <button
          type="submit"
          disabled={!csvText.trim() || preview.missingHeaders.length > 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar importacion
        </button>
      </form>
    </div>
  );
}
