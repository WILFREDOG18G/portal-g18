import { requireModuleAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  createLoanRequest,
  createMemo,
  createPayrollIncident,
  createWorkLetterRequest,
} from "./actions";

export default async function RrhhPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    message?: string;
    bu?: string;
    month?: string;
    year?: string;
  };
}) {
  await requireModuleAccess("rrhh");
  const supabase = createClient();

  const selectedBu = searchParams?.bu ?? "";
  const selectedMonth = Number(searchParams?.month ?? `${new Date().getMonth() + 1}`);
  const selectedYear = Number(searchParams?.year ?? `${new Date().getFullYear()}`);

  const { data: businessUnits } = await supabase
    .from("business_units")
    .select("id,name")
    .order("name", { ascending: true });

  let employeesQuery = supabase
    .from("employees")
    .select("id,full_name,business_unit_id,area_id,position,contract_type,status,identification_number,salary")
    .order("full_name", { ascending: true });

  if (selectedBu) employeesQuery = employeesQuery.eq("business_unit_id", selectedBu);

  const { data: employees } = await employeesQuery;

  const { data: incidentTypes } = await supabase
    .from("incident_types")
    .select("id,name,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  let incidentsQuery = supabase
    .from("payroll_incidents")
    .select("id,employee_id,business_unit_id,pay_period,month,year,incident_type,quantity,notes,created_at")
    .eq("month", selectedMonth)
    .eq("year", selectedYear)
    .order("created_at", { ascending: false });

  let loansQuery = supabase
    .from("loan_requests")
    .select("id,employee_id,business_unit_id,amount,installment_amount,installments_count,last_installment_amount,reason,request_date,approved_amount,status,created_at")
    .order("created_at", { ascending: false });

  let workLettersQuery = supabase
    .from("work_letters")
    .select("id,employee_id,business_unit_id,purpose,request_date,contract_type,hire_date_text,salary,weekly_tip_avg,identification,status,created_at")
    .order("created_at", { ascending: false });

  let memosQuery = supabase
    .from("memos")
    .select("id,target_employee_id,business_unit_id,memo_type,subject,body,date,status,created_at")
    .order("created_at", { ascending: false });

  if (selectedBu) {
    incidentsQuery = incidentsQuery.eq("business_unit_id", selectedBu);
    loansQuery = loansQuery.eq("business_unit_id", selectedBu);
    workLettersQuery = workLettersQuery.eq("business_unit_id", selectedBu);
    memosQuery = memosQuery.eq("business_unit_id", selectedBu);
  }

  const { data: incidents } = await incidentsQuery.limit(100);
  const { data: loanRequests } = await loansQuery.limit(100);
  const { data: workLetters } = await workLettersQuery.limit(100);
  const { data: memos } = await memosQuery.limit(100);

  const employeeById = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const businessUnitById = new Map((businessUnits ?? []).map((unit) => [unit.id, unit.name]));

  const totalApprovedLoans = (loanRequests ?? [])
    .filter((loan) => loan.status === "aprobado")
    .reduce((acc, loan) => acc + Number(loan.approved_amount ?? 0), 0);

  const totalIncidents = (incidents ?? []).length;
  const pendingLetters = (workLetters ?? []).filter((letter) => letter.status !== "entregada").length;

  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Modulo RRHH</h1>
        <p className="mt-2 text-slate-600">Personal maestro, incidencias, adelantos, cartas de trabajo y memos.</p>
      </header>

      {searchParams?.error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{searchParams.error}</p>
      ) : null}

      {searchParams?.message ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{searchParams.message}</p>
      ) : null}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Filtros RRHH</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" action="/app/rrhh" method="get">
          <select name="bu" defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las unidades</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <select name="month" defaultValue={String(selectedMonth)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select name="year" defaultValue={String(selectedYear)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Aplicar</button>
        </form>
      </section>

      <section className="mb-8 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Incidencias del periodo</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalIncidents}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Adelantos aprobados</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${totalApprovedLoans.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cartas pendientes</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendingLetters}</p>
        </article>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Personal maestro</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Cargo</th>
                <th className="px-2 py-2 font-medium">Contrato</th>
                <th className="px-2 py-2 font-medium">Documento</th>
                <th className="px-2 py-2 font-medium">Salario</th>
                <th className="px-2 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{employee.full_name}</td>
                  <td className="px-2 py-2">{businessUnitById.get(employee.business_unit_id) ?? "-"}</td>
                  <td className="px-2 py-2">{employee.position}</td>
                  <td className="px-2 py-2">{employee.contract_type}</td>
                  <td className="px-2 py-2">{employee.identification_number ?? "-"}</td>
                  <td className="px-2 py-2">{employee.salary ? `$${Number(employee.salary).toFixed(2)}` : "-"}</td>
                  <td className="px-2 py-2">{employee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Registrar incidencia quincenal</h2>
        <form action={createPayrollIncident} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="employeeId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Colaborador</option>
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
          <select name="payPeriod" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="1-15">1-15</option>
            <option value="16-fin">16-fin</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input name="month" type="number" min="1" max="12" defaultValue={selectedMonth} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="year" type="number" min="2020" max="2100" defaultValue={selectedYear} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <select name="incidentType" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tipo de incidencia</option>
            {(incidentTypes ?? []).map((type) => (
              <option key={type.id} value={type.name}>{type.name}</option>
            ))}
          </select>
          <input name="quantity" type="number" step="0.01" placeholder="Cantidad (opcional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="notes" placeholder="Notas" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Guardar incidencia</button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Solicitud de adelanto</h2>
        <form action={createLoanRequest} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="employeeId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Colaborador</option>
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
          <input name="amount" type="number" min="0" step="0.01" required placeholder="Monto solicitado" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select name="installmentAmount" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="50">Cuota $50</option>
            <option value="100">Cuota $100</option>
          </select>
          <input name="requestDate" type="date" defaultValue={today} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="reason" placeholder="Motivo" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Guardar adelanto</button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Solicitud de carta de trabajo</h2>
        <form action={createWorkLetterRequest} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="employeeId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Colaborador</option>
            {(employees ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>
          <input name="requestDate" type="date" defaultValue={today} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="purpose" placeholder="Proposito" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <input name="hireDateText" placeholder="Fecha de ingreso (texto)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="salary" type="number" min="0" step="0.01" placeholder="Salario mensual" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="weeklyTipAvg" type="number" min="0" step="0.01" placeholder="Propina semanal promedio (SP)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="identification" placeholder="Documento/Pasaporte" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">Guardar carta</button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Registrar memo</h2>
        <form action={createMemo} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="targetEmployeeId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todo el personal</option>
            {(employees ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>
          <select name="businessUnitId" defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las unidades</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <input name="memoType" required placeholder="Tipo de memo" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="subject" required placeholder="Asunto" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="date" type="date" defaultValue={today} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="status" placeholder="Estado" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea name="body" required placeholder="Cuerpo del memo" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" rows={3} />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">Guardar memo</button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tabla de incidencias quincenales</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Periodo</th>
                <th className="px-2 py-2 font-medium">Colaborador</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {(incidents ?? []).map((incident) => (
                <tr key={incident.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{incident.pay_period} · {incident.month}/{incident.year}</td>
                  <td className="px-2 py-2">{employeeById.get(incident.employee_id) ?? "-"}</td>
                  <td className="px-2 py-2">{businessUnitById.get(incident.business_unit_id) ?? "-"}</td>
                  <td className="px-2 py-2">{incident.incident_type}</td>
                  <td className="px-2 py-2">{incident.quantity ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tabla de adelantos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Colaborador</th>
                <th className="px-2 py-2 font-medium">Monto</th>
                <th className="px-2 py-2 font-medium">Cuota</th>
                <th className="px-2 py-2 font-medium"># Cuotas</th>
                <th className="px-2 py-2 font-medium">Ultima cuota</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {(loanRequests ?? []).map((loan) => (
                <tr key={loan.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{loan.request_date}</td>
                  <td className="px-2 py-2">{employeeById.get(loan.employee_id) ?? "-"}</td>
                  <td className="px-2 py-2">${Number(loan.amount ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-2">${Number(loan.installment_amount ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-2">{loan.installments_count}</td>
                  <td className="px-2 py-2">${Number(loan.last_installment_amount ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-2">{loan.status}</td>
                  <td className="px-2 py-2">
                    <a href={`/api/rrhh/loan-request/${loan.id}/pdf`} target="_blank" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Ver PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tabla de cartas de trabajo</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Colaborador</th>
                <th className="px-2 py-2 font-medium">Contrato</th>
                <th className="px-2 py-2 font-medium">Proposito</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {(workLetters ?? []).map((letter) => (
                <tr key={letter.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{letter.request_date}</td>
                  <td className="px-2 py-2">{employeeById.get(letter.employee_id) ?? "-"}</td>
                  <td className="px-2 py-2">{letter.contract_type}</td>
                  <td className="px-2 py-2">{letter.purpose ?? "-"}</td>
                  <td className="px-2 py-2">{letter.status}</td>
                  <td className="px-2 py-2">
                    <a href={`/api/rrhh/work-letter/${letter.id}/pdf`} target="_blank" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Ver PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tabla de memos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Asunto</th>
                <th className="px-2 py-2 font-medium">Colaborador objetivo</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(memos ?? []).map((memo) => (
                <tr key={memo.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">{memo.date}</td>
                  <td className="px-2 py-2">{memo.memo_type}</td>
                  <td className="px-2 py-2">{memo.subject}</td>
                  <td className="px-2 py-2">{memo.target_employee_id ? employeeById.get(memo.target_employee_id) ?? "-" : "Todo el personal"}</td>
                  <td className="px-2 py-2">{memo.business_unit_id ? businessUnitById.get(memo.business_unit_id) ?? "-" : "Todas"}</td>
                  <td className="px-2 py-2">{memo.status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
