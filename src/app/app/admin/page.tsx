import { requireModuleAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import FilterBar from "@/components/ui/FilterBar";
import ModuleHeader from "@/components/ui/ModuleHeader";
import SectionCard from "@/components/ui/SectionCard";
import EmployeeCsvImporter from "./EmployeeCsvImporter";
import {
  createPettyCashRecord,
  createTempStaffRecord,
  createTipRecord,
  importEmployeesCsv,
} from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    message?: string;
    importReport?: string;
    bu?: string;
    from?: string;
    to?: string;
  };
}) {
  await requireModuleAccess("admin");
  const supabase = createClient();

  const selectedBu = searchParams?.bu ?? "";
  const selectedFrom = searchParams?.from ?? "";
  const selectedTo = searchParams?.to ?? "";

  const { data: businessUnits } = await supabase
    .from("business_units")
    .select("id,name")
    .order("name", { ascending: true });

  const { data: employees } = await supabase
    .from("employees")
    .select("id,full_name,business_unit_id,status")
    .eq("status", "activo")
    .order("full_name", { ascending: true });

  const { data: areas } = await supabase
    .from("areas")
    .select("id,name,business_unit_id")
    .order("name", { ascending: true });

  let tipsQuery = supabase
    .from("tips_records")
    .select("id,employee_id,business_unit_id,shift,amount,date,notes,created_at")
    .order("date", { ascending: false });

  let pettyQuery = supabase
    .from("petty_cash_records")
    .select("id,business_unit_id,category,amount,description,responsible,date,created_at")
    .order("date", { ascending: false });

  let tempStaffQuery = supabase
    .from("temp_staff_records")
    .select("id,full_name,business_unit_id,area_id,event_type,event_date,start_time,end_time,hourly_rate,hours_calculated,total_amount,notes")
    .order("event_date", { ascending: false });

  if (selectedBu) {
    tipsQuery = tipsQuery.eq("business_unit_id", selectedBu);
    pettyQuery = pettyQuery.eq("business_unit_id", selectedBu);
    tempStaffQuery = tempStaffQuery.eq("business_unit_id", selectedBu);
  }

  if (selectedFrom) {
    tipsQuery = tipsQuery.gte("date", selectedFrom);
    pettyQuery = pettyQuery.gte("date", selectedFrom);
    tempStaffQuery = tempStaffQuery.gte("event_date", selectedFrom);
  }

  if (selectedTo) {
    tipsQuery = tipsQuery.lte("date", selectedTo);
    pettyQuery = pettyQuery.lte("date", selectedTo);
    tempStaffQuery = tempStaffQuery.lte("event_date", selectedTo);
  }

  const { data: tipsRecords } = await tipsQuery.limit(100);
  const { data: pettyCashRecords } = await pettyQuery.limit(100);
  const { data: tempStaffRecords } = await tempStaffQuery.limit(100);

  const tipTotal = (tipsRecords ?? []).reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
  const pettyTotal = (pettyCashRecords ?? []).reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
  const tempStaffTotal = (tempStaffRecords ?? []).reduce((acc, row) => acc + Number(row.total_amount ?? 0), 0);

  const employeeById = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const businessUnitById = new Map((businessUnits ?? []).map((unit) => [unit.id, unit.name]));
  const areaById = new Map((areas ?? []).map((area) => [area.id, area.name]));

  const today = new Date().toISOString().slice(0, 10);

  let importReport: {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null = null;

  if (searchParams?.importReport) {
    try {
      const decoded = Buffer.from(searchParams.importReport, "base64url").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (
        parsed &&
        typeof parsed.totalRows === "number" &&
        typeof parsed.created === "number" &&
        typeof parsed.updated === "number" &&
        typeof parsed.skipped === "number" &&
        Array.isArray(parsed.errors)
      ) {
        importReport = parsed;
      }
    } catch {
      importReport = null;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-6 sm:py-10">
      <ModuleHeader
        title="Admin"
        description="Propina, caja menuda y eventuales con formularios, tablas, filtros y totales."
      />

      {searchParams?.error ? (
        <p className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{searchParams.error}</p>
      ) : null}

      {searchParams?.message ? (
        <p className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{searchParams.message}</p>
      ) : null}

      <SectionCard title="Filtros globales" className="mb-8">
        <FilterBar action="/app/admin">
          <select name="bu" defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las unidades</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={selectedFrom} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="to" type="date" defaultValue={selectedTo} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Aplicar</button>
        </FilterBar>
      </SectionCard>

      <SectionCard title="Importador de personal por CSV" className="mb-8">
        <EmployeeCsvImporter
          businessUnits={businessUnits ?? []}
          areas={areas ?? []}
          action={importEmployeesCsv}
        />

        {importReport ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Resultado de importacion</p>
            <p className="mt-1 text-xs text-slate-600">
              Total filas: {importReport.totalRows} | Creados: {importReport.created} | Actualizados: {importReport.updated} | Omitidos: {importReport.skipped}
            </p>
            {importReport.errors.length > 0 ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-rose-700">
                {importReport.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-emerald-700">Sin errores por fila.</p>
            )}
          </div>
        ) : null}
      </SectionCard>

      <section className="mb-8 grid gap-3 md:grid-cols-3">
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total propina</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${tipTotal.toFixed(2)}</p>
        </article>
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total caja menuda</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${pettyTotal.toFixed(2)}</p>
        </article>
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total eventuales</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${tempStaffTotal.toFixed(2)}</p>
        </article>
      </section>

      <SectionCard title="Registrar propina" className="mb-8">
        <form action={createTipRecord} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="employeeId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Colaborador activo</option>
            {(employees ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>
          <select name="businessUnitId" required defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Unidad de negocio</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <select name="shift" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="almuerzo">Almuerzo</option>
            <option value="cena">Cena</option>
            <option value="completo">Completo</option>
          </select>
          <input name="amount" type="number" min="0" step="0.01" placeholder="Monto" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="date" type="date" defaultValue={today} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="notes" placeholder="Notas" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Guardar propina</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Registrar caja menuda" className="mb-8">
        <form action={createPettyCashRecord} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="businessUnitId" required defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Unidad de negocio</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <input name="category" required placeholder="Categoria" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="amount" type="number" min="0" step="0.01" placeholder="Monto" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="date" type="date" defaultValue={today} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="description" placeholder="Descripcion" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="responsible" placeholder="Responsable" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Guardar caja menuda</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Registrar eventual" className="mb-8">
        <form action={createTempStaffRecord} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="fullName" required placeholder="Nombre completo" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select name="businessUnitId" required defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Unidad de negocio</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <select name="areaId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Sin area</option>
            {(areas ?? []).map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
          <input name="eventType" required placeholder="Tipo de evento" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="eventDate" type="date" defaultValue={today} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="hourlyRate" type="number" min="0" step="0.01" required placeholder="Tarifa por hora" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="startTime" type="time" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="endTime" type="time" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="notes" placeholder="Notas" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">Guardar eventual</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Tabla de propinas" className="mb-8">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Colaborador</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Turno</th>
                <th className="px-2 py-2 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(tipsRecords ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{row.date}</td>
                  <td className="px-2 py-2">{employeeById.get(row.employee_id) ?? "-"}</td>
                  <td className="px-2 py-2">{businessUnitById.get(row.business_unit_id) ?? "-"}</td>
                  <td className="px-2 py-2">{row.shift}</td>
                  <td className="px-2 py-2">${Number(row.amount ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Tabla de caja menuda" className="mb-8">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Categoria</th>
                <th className="px-2 py-2 font-medium">Responsable</th>
                <th className="px-2 py-2 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(pettyCashRecords ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{row.date}</td>
                  <td className="px-2 py-2">{businessUnitById.get(row.business_unit_id) ?? "-"}</td>
                  <td className="px-2 py-2">{row.category}</td>
                  <td className="px-2 py-2">{row.responsible ?? "-"}</td>
                  <td className="px-2 py-2">${Number(row.amount ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Tabla de eventuales">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Area</th>
                <th className="px-2 py-2 font-medium">Horas</th>
                <th className="px-2 py-2 font-medium">Tarifa</th>
                <th className="px-2 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(tempStaffRecords ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{row.event_date}</td>
                  <td className="px-2 py-2">{row.full_name}</td>
                  <td className="px-2 py-2">{businessUnitById.get(row.business_unit_id) ?? "-"}</td>
                  <td className="px-2 py-2">{row.area_id ? areaById.get(row.area_id) ?? "-" : "-"}</td>
                  <td className="px-2 py-2">{row.hours_calculated ?? "-"}</td>
                  <td className="px-2 py-2">${Number(row.hourly_rate ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-2">{row.total_amount ? `$${Number(row.total_amount).toFixed(2)}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </main>
  );
}
