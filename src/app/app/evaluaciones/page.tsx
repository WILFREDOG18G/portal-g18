import { requireModuleAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ConfirmStatusButton from "./ConfirmStatusButton";
import PrintReportsButton from "./PrintReportsButton";
import {
  createManualQuizAttempt,
  createEmployee,
  reassignQuizAttemptEmployee,
  startQuizAttempt,
  toggleEmployeeStatus,
  updateEmployee,
} from "./actions";

export default async function EvaluacionesPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    message?: string;
    bu?: string;
    area?: string;
    status?: string;
    editId?: string;
    qBu?: string;
    qArea?: string;
    qType?: string;
    qCount?: string;
    aBu?: string;
    aArea?: string;
    aEmployee?: string;
  };
}) {
  const profile = await requireModuleAccess("evaluaciones");
  const supabase = createClient();
  const selectedBu = searchParams?.bu ?? "";
  const selectedArea = searchParams?.area ?? "";
  const selectedStatus = searchParams?.status ?? "";
  const editId = searchParams?.editId ?? "";
  const selectedQuizBu = searchParams?.qBu ?? "";
  const selectedQuizArea = searchParams?.qArea ?? "";
  const selectedQuizType = searchParams?.qType ?? "menu";
  const selectedQuizCount = searchParams?.qCount ?? "20";
  const selectedAttemptBu = searchParams?.aBu ?? "";
  const selectedAttemptArea = searchParams?.aArea ?? "";
  const selectedAttemptEmployee = searchParams?.aEmployee ?? "";
  const questionCount = Number(selectedQuizCount) || 20;

  const { data: businessUnits } = await supabase
    .from("business_units")
    .select("id,name")
    .order("name", { ascending: true });

  const { data: areas } = await supabase
    .from("areas")
    .select("id,name,business_unit_id")
    .order("name", { ascending: true });

  const { data: employeeDirectory } = await supabase
    .from("employees")
    .select("id,full_name,business_unit_id,area_id,status")
    .order("full_name", { ascending: true });

  let employeesQuery = supabase
    .from("employees")
    .select("id,full_name,position,status,contract_type,business_unit_id,area_id,identification_number,salary,created_at")
    .order("created_at", { ascending: false });

  if (selectedBu) employeesQuery = employeesQuery.eq("business_unit_id", selectedBu);
  if (selectedArea) employeesQuery = employeesQuery.eq("area_id", selectedArea);
  if (selectedStatus) employeesQuery = employeesQuery.eq("status", selectedStatus);

  const { data: employees } = await employeesQuery.limit(100);

  const { data: editableEmployee } = editId
    ? await supabase
        .from("employees")
        .select("id,full_name,position,status,contract_type,business_unit_id,area_id,identification_number,salary")
        .eq("id", editId)
        .maybeSingle()
    : { data: null };

  const { data: quizBanks } = await supabase
    .from("quiz_banks")
    .select("id,business_unit_id,area_id,category");

  const quizEmployees = (employeeDirectory ?? []).filter((employee) => employee.status === "activo");

  let attemptsQuery = supabase
    .from("quiz_attempts")
    .select("id,employee_id,business_unit_id,area_id,quiz_type,total_questions,correct_answers,attempt_number,taken_at,tip_percentage")
    .order("taken_at", { ascending: false });

  if (selectedAttemptBu) attemptsQuery = attemptsQuery.eq("business_unit_id", selectedAttemptBu);
  if (selectedAttemptArea) attemptsQuery = attemptsQuery.eq("area_id", selectedAttemptArea);
  if (selectedAttemptEmployee) attemptsQuery = attemptsQuery.eq("employee_id", selectedAttemptEmployee);

  const { data: attempts } = await attemptsQuery.limit(200);

  const { data: attemptMetrics } = await supabase
    .from("quiz_attempts")
    .select("employee_id,correct_answers,total_questions,business_unit_id");

  const { count: activeEmployeesCount } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("status", "activo");

  const { count: inactiveEmployeesCount } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("status", "inactivo");

  const filteredQuizBanks = (quizBanks ?? []).filter((q) => {
    if (selectedQuizBu && q.business_unit_id !== selectedQuizBu) return false;
    if (selectedQuizArea && q.area_id !== selectedQuizArea) return false;
    return true;
  });

  const totalQuestionsInBank = filteredQuizBanks.length;
  const priceQuestionsCount = filteredQuizBanks.filter((q) => q.category === "precio").length;
  const pricePct = totalQuestionsInBank > 0 ? (priceQuestionsCount / totalQuestionsInBank) * 100 : 0;
  const maxPriceAllowed = Math.floor(questionCount * 0.1);

  const filteredQuizEmployees = (quizEmployees ?? []).filter((employee) => {
    if (selectedQuizBu && employee.business_unit_id !== selectedQuizBu) return false;
    if (selectedQuizArea && employee.area_id !== selectedQuizArea) return false;
    return true;
  });

  const filterParams = new URLSearchParams();
  if (selectedBu) filterParams.set("bu", selectedBu);
  if (selectedArea) filterParams.set("area", selectedArea);
  if (selectedStatus) filterParams.set("status", selectedStatus);
  const filterBase = filterParams.toString();

  const businessUnitById = new Map((businessUnits ?? []).map((u) => [u.id, u.name]));
  const areaById = new Map((areas ?? []).map((a) => [a.id, a.name]));
  const employeeById = new Map((employeeDirectory ?? []).map((employee) => [employee.id, employee.full_name]));

  const attemptRows = attempts ?? [];
  const metricsRows = attemptMetrics ?? [];
  const attemptsCount = metricsRows.length;
  const distinctAttemptEmployees = new Set(metricsRows.map((row) => row.employee_id)).size;
  const pendingEvaluations = Math.max((activeEmployeesCount ?? 0) - distinctAttemptEmployees, 0);

  const averageScorePct =
    metricsRows.length > 0
      ? metricsRows.reduce((acc, row) => acc + (row.correct_answers / row.total_questions) * 100, 0) / metricsRows.length
      : 0;

  const unitAttemptCount = new Map<string, number>();
  for (const row of metricsRows) {
    unitAttemptCount.set(row.business_unit_id, (unitAttemptCount.get(row.business_unit_id) ?? 0) + 1);
  }

  const rankingMap = new Map<string, { totalPct: number; attempts: number }>();
  for (const row of metricsRows) {
    const current = rankingMap.get(row.employee_id) ?? { totalPct: 0, attempts: 0 };
    current.totalPct += (row.correct_answers / row.total_questions) * 100;
    current.attempts += 1;
    rankingMap.set(row.employee_id, current);
  }

  const ranking = Array.from(rankingMap.entries())
    .map(([employeeId, score]) => ({
      employeeId,
      averagePct: score.totalPct / score.attempts,
      attempts: score.attempts,
    }))
    .sort((a, b) => b.averagePct - a.averagePct)
    .slice(0, 5);

  const pendingEmployees = (employeeDirectory ?? []).filter(
    (employee) => employee.status === "activo" && !rankingMap.has(employee.id)
  );

  const latestAttempts = [...attemptRows].slice(0, 10);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-6 sm:py-10">
      <header className="card-surface rise-in mb-8 rounded-3xl border p-6 shadow-sm sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Modulo
        </p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-4xl">
          Evaluaciones
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Gestion de colaboradores, intentos, metricas y reportes operativos de conocimiento.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Sesion: {profile.full_name} ({profile.role})
        </p>
      </header>

      {searchParams?.error ? (
        <p className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {searchParams.error}
        </p>
      ) : null}

      {searchParams?.message ? (
        <p className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {searchParams.message}
        </p>
      ) : null}

      {profile.role === "manager" && profile.business_unit_ids.length === 0 ? (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Tu usuario manager aun no tiene unidades asignadas en profiles.business_unit_ids.
        </p>
      ) : null}

      <section className="mb-8 grid gap-3 md:grid-cols-4">
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Activos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{activeEmployeesCount ?? 0}</p>
        </article>
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Inactivos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{inactiveEmployeesCount ?? 0}</p>
        </article>
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Intentos registrados</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{attemptsCount}</p>
        </article>
        <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pendientes de evaluar</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendingEvaluations}</p>
        </article>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <article className="card-surface rise-in rounded-2xl border p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Reportes rapidos</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>Por colaborador: {distinctAttemptEmployees} con historial de intentos.</p>
            <p>Historial total: {attemptsCount} intentos acumulados.</p>
            <p>Pendientes de evaluar: {pendingEvaluations} colaboradores activos sin intento.</p>
            <p>Promedio global: {averageScorePct.toFixed(1)}% de respuestas correctas.</p>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Por unidad</p>
            {(businessUnits ?? []).map((unit) => (
              <p key={unit.id}>
                {unit.name}: {unitAttemptCount.get(unit.id) ?? 0} intentos
              </p>
            ))}
          </div>
        </article>

        <article className="card-surface rise-in rounded-2xl border p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Escala de propinas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 font-medium">% correctas</th>
                  <th className="px-2 py-2 font-medium">% propina aprobada</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-2">1% - 49%</td>
                  <td className="px-2 py-2">0%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-2">50% - 59%</td>
                  <td className="px-2 py-2">50%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-2">60% - 79%</td>
                  <td className="px-2 py-2">75%</td>
                </tr>
                <tr>
                  <td className="px-2 py-2">80% - 100%</td>
                  <td className="px-2 py-2">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="card-surface rise-in mb-8 rounded-2xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Registro manual de resultado</h2>
          <p className="text-xs text-slate-500">Para correcciones operativas o carga controlada.</p>
        </div>

        <form action={createManualQuizAttempt} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="manualEmployeeId">
              Colaborador activo
            </label>
            <select id="manualEmployeeId" name="employeeId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Selecciona colaborador</option>
              {quizEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="manualQuizType">
              Tipo
            </label>
            <select id="manualQuizType" name="quizType" defaultValue="menu" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="menu">Menu</option>
              <option value="kosher">Kosher</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="manualMode">
              Modalidad
            </label>
            <select id="manualMode" name="mode" defaultValue="manual" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="manual">Manual</option>
              <option value="examen">Examen</option>
              <option value="practica">Practica</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="manualTotalQuestions">
              Total de preguntas
            </label>
            <input id="manualTotalQuestions" name="totalQuestions" type="number" min="1" max="100" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="manualCorrectAnswers">
              Respuestas correctas
            </label>
            <input id="manualCorrectAnswers" name="correctAnswers" type="number" min="0" max="100" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Registrar resultado manual
            </button>
          </div>
        </form>
      </section>

      <section className="card-surface rise-in mb-8 rounded-2xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Reportes (4 vistas)</h2>
          <PrintReportsButton />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">1) Por colaborador</h3>
            <p className="mt-2 text-xs text-slate-600">Resumen en ranking y promedio por persona.</p>
            <p className="mt-1 text-xs text-slate-600">Filtrado disponible en Historial de intentos.</p>
          </article>

          <article className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">2) Por unidad</h3>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {(businessUnits ?? []).map((unit) => (
                <p key={unit.id}>{unit.name}: {unitAttemptCount.get(unit.id) ?? 0} intentos</p>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">3) Pendientes de evaluar</h3>
            <p className="mt-2 text-xs text-slate-600">Total: {pendingEmployees.length}</p>
            <ul className="mt-2 max-h-28 list-inside list-disc overflow-auto text-xs text-slate-600">
              {pendingEmployees.slice(0, 12).map((employee) => (
                <li key={employee.id}>{employee.full_name}</li>
              ))}
              {pendingEmployees.length === 0 ? <li>Sin pendientes</li> : null}
            </ul>
          </article>

          <article className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">4) Historial (ultimos resultados)</h3>
            <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-slate-600">
              {latestAttempts.map((attempt) => (
                <li key={attempt.id}>
                  {employeeById.get(attempt.employee_id) ?? "-"}: {attempt.correct_answers}/{attempt.total_questions} · {attempt.tip_percentage ?? 0}%
                </li>
              ))}
              {latestAttempts.length === 0 ? <li>Sin resultados recientes</li> : null}
            </ul>
          </article>
        </div>
      </section>

      <section className="card-surface rise-in mb-8 rounded-2xl border p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ranking de desempeno</h2>
        <p className="mt-1 text-sm text-slate-600">Top 5 colaboradores por promedio de aciertos.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Colaborador</th>
                <th className="px-2 py-2 font-medium">Promedio</th>
                <th className="px-2 py-2 font-medium">Intentos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={3}>
                    Aun no hay intentos registrados.
                  </td>
                </tr>
              ) : (
                ranking.map((item) => (
                  <tr key={item.employeeId} className="border-b border-slate-100">
                    <td className="px-2 py-2 text-slate-900">{employeeById.get(item.employeeId) ?? "-"}</td>
                    <td className="px-2 py-2 text-slate-700">{item.averagePct.toFixed(1)}%</td>
                    <td className="px-2 py-2 text-slate-700">{item.attempts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-surface rise-in mb-8 rounded-2xl border p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nuevo colaborador</h2>

        <form action={createEmployee} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fullName">
              Nombre completo *
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="position">
              Cargo *
            </label>
            <input
              id="position"
              name="position"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="businessUnitId">
              Unidad *
            </label>
            <select
              id="businessUnitId"
              name="businessUnitId"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            >
              <option value="">Selecciona unidad</option>
              {(businessUnits ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="areaId">
              Area
            </label>
            <select
              id="areaId"
              name="areaId"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            >
              <option value="">Sin area</option>
              {(areas ?? []).map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contractType">
              Tipo contrato *
            </label>
            <select
              id="contractType"
              name="contractType"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            >
              <option value="SIPE">SIPE</option>
              <option value="SP">SP</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="identificationNumber">
              Documento
            </label>
            <input
              id="identificationNumber"
              name="identificationNumber"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="salary">
              Salario
            </label>
            <input
              id="salary"
              name="salary"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Guardar colaborador
            </button>
          </div>
        </form>
      </section>

      <section className="card-surface rise-in mb-8 rounded-2xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Historial de intentos</h2>
          <p className="text-sm text-slate-500">{attemptRows.length} registros filtrados</p>
        </div>

        <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4" action="/app/evaluaciones" method="get">
          <select name="aBu" defaultValue={selectedAttemptBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las unidades</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>

          <select name="aArea" defaultValue={selectedAttemptArea} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las areas</option>
            {(areas ?? []).map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>

          <select name="aEmployee" defaultValue={selectedAttemptEmployee} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos los colaboradores</option>
            {(employeeDirectory ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              Filtrar
            </button>
            <Link href="/app/evaluaciones" className="rounded-lg border border-transparent px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
              Limpiar
            </Link>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Colaborador</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Area</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Intento</th>
                <th className="px-2 py-2 font-medium">Resultado</th>
                <th className="px-2 py-2 font-medium">Propina</th>
                {profile.role === "admin" ? <th className="px-2 py-2 font-medium">Edicion post-hoc</th> : null}
              </tr>
            </thead>
            <tbody>
              {attemptRows.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={profile.role === "admin" ? 9 : 8}>
                    No hay intentos para el filtro actual.
                  </td>
                </tr>
              ) : (
                attemptRows.map((attempt) => {
                  const scorePct = ((attempt.correct_answers / attempt.total_questions) * 100).toFixed(1);
                  const reassignCandidates = (employeeDirectory ?? []).filter(
                    (employee) =>
                      employee.status === "activo" &&
                      employee.business_unit_id === attempt.business_unit_id &&
                      employee.area_id === attempt.area_id
                  );

                  return (
                    <tr key={attempt.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-700">{new Date(attempt.taken_at).toLocaleString()}</td>
                      <td className="px-2 py-2 text-slate-900">{employeeById.get(attempt.employee_id) ?? "-"}</td>
                      <td className="px-2 py-2 text-slate-700">{businessUnitById.get(attempt.business_unit_id) ?? "-"}</td>
                      <td className="px-2 py-2 text-slate-700">{attempt.area_id ? areaById.get(attempt.area_id) ?? "-" : "-"}</td>
                      <td className="px-2 py-2 text-slate-700">{attempt.quiz_type}</td>
                      <td className="px-2 py-2 text-slate-700">#{attempt.attempt_number}</td>
                      <td className="px-2 py-2 text-slate-700">
                        {attempt.correct_answers}/{attempt.total_questions} ({scorePct}%)
                      </td>
                      <td className="px-2 py-2 text-slate-700">{attempt.tip_percentage ?? 0}%</td>
                      {profile.role === "admin" ? (
                        <td className="px-2 py-2">
                          <form action={reassignQuizAttemptEmployee} className="flex items-center gap-2">
                            <input type="hidden" name="attemptId" value={attempt.id} />
                            <select name="newEmployeeId" defaultValue={attempt.employee_id} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                              {reassignCandidates.map((employee) => (
                                <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                              ))}
                            </select>
                            <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              Reasignar
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editableEmployee ? (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Editar colaborador</h2>
            <Link
              href={filterBase ? `/app/evaluaciones?${filterBase}` : "/app/evaluaciones"}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </Link>
          </div>

          <form action={updateEmployee} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="employeeId" value={editableEmployee.id} />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editFullName">
                Nombre completo *
              </label>
              <input
                id="editFullName"
                name="fullName"
                required
                defaultValue={editableEmployee.full_name}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editPosition">
                Cargo *
              </label>
              <input
                id="editPosition"
                name="position"
                required
                defaultValue={editableEmployee.position}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editBusinessUnitId">
                Unidad *
              </label>
              <select
                id="editBusinessUnitId"
                name="businessUnitId"
                defaultValue={editableEmployee.business_unit_id}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              >
                {(businessUnits ?? []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editAreaId">
                Area
              </label>
              <select
                id="editAreaId"
                name="areaId"
                defaultValue={editableEmployee.area_id ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              >
                <option value="">Sin area</option>
                {(areas ?? []).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editContractType">
                Tipo contrato *
              </label>
              <select
                id="editContractType"
                name="contractType"
                defaultValue={editableEmployee.contract_type}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              >
                <option value="SIPE">SIPE</option>
                <option value="SP">SP</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editIdentificationNumber">
                Documento
              </label>
              <input
                id="editIdentificationNumber"
                name="identificationNumber"
                defaultValue={editableEmployee.identification_number ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="editSalary">
                Salario
              </label>
              <input
                id="editSalary"
                name="salary"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editableEmployee.salary ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card-surface rise-in mb-8 rounded-2xl border p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Generador de prueba</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" action="/app/evaluaciones" method="get">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qBu">
              Unidad
            </label>
            <select id="qBu" name="qBu" defaultValue={selectedQuizBu} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {(businessUnits ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qArea">
              Area
            </label>
            <select id="qArea" name="qArea" defaultValue={selectedQuizArea} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {(areas ?? []).map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qType">
              Tipo
            </label>
            <select id="qType" name="qType" defaultValue={selectedQuizType} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="menu">Menu</option>
              <option value="kosher">Kosher</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qCount">
              Cantidad de preguntas
            </label>
            <input id="qCount" name="qCount" type="number" min="5" max="50" defaultValue={questionCount} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Evaluar banco
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>Preguntas disponibles en filtro: {totalQuestionsInBank}</p>
          <p>Preguntas de precio: {priceQuestionsCount} ({pricePct.toFixed(1)}%)</p>
          <p>Maximo recomendado de precio para {questionCount} preguntas: {maxPriceAllowed}</p>
          {pricePct > 10 ? (
            <p className="mt-1 text-rose-700">Advertencia: el banco supera el 10% de preguntas de precio.</p>
          ) : (
            <p className="mt-1 text-emerald-700">Regla 10% precio: OK.</p>
          )}
        </div>

        <form action={startQuizAttempt} className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <input type="hidden" name="businessUnitId" value={selectedQuizBu} />
          <input type="hidden" name="areaId" value={selectedQuizArea} />
          <input type="hidden" name="quizType" value={selectedQuizType} />
          <input type="hidden" name="questionCount" value={questionCount} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="employeeId">
              Colaborador activo
            </label>
            <select
              id="employeeId"
              name="employeeId"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona colaborador</option>
              {filteredQuizEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="mode">
              Modalidad
            </label>
            <select id="mode" name="mode" defaultValue="practica" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="practica">Practica</option>
              <option value="examen">Examen</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              El intento se arma con seleccion aleatoria y limite de 10% para preguntas de precio.
            </p>
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Iniciar prueba
            </button>
          </div>
        </form>
      </section>

      <section className="card-surface rise-in rounded-2xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Listado de personal</h2>
          <p className="text-sm text-slate-500">{(employees ?? []).length} registros</p>
        </div>

        <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4" action="/app/evaluaciones" method="get">
          <select name="bu" defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las unidades</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>

          <select name="area" defaultValue={selectedArea} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todas las areas</option>
            {(areas ?? []).map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>

          <select name="status" defaultValue={selectedStatus} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <div className="flex items-center gap-2">
            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              Filtrar
            </button>
            <Link href="/app/evaluaciones" className="rounded-lg border border-transparent px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
              Limpiar
            </Link>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Area</th>
                <th className="px-2 py-2 font-medium">Cargo</th>
                <th className="px-2 py-2 font-medium">Contrato</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">Accion</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 text-slate-900">{employee.full_name}</td>
                  <td className="px-2 py-2 text-slate-700">
                    {businessUnitById.get(employee.business_unit_id) ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {employee.area_id ? areaById.get(employee.area_id) ?? "-" : "-"}
                  </td>
                  <td className="px-2 py-2 text-slate-700">{employee.position}</td>
                  <td className="px-2 py-2 text-slate-700">{employee.contract_type}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        employee.status === "activo"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          filterBase
                            ? `/app/evaluaciones?${filterBase}&editId=${employee.id}`
                            : `/app/evaluaciones?editId=${employee.id}`
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </Link>

                      <form action={toggleEmployeeStatus}>
                        <input type="hidden" name="employeeId" value={employee.id} />
                        <input type="hidden" name="currentStatus" value={employee.status} />
                        <ConfirmStatusButton
                          employeeName={employee.full_name}
                          label={employee.status === "activo" ? "Inactivar" : "Activar"}
                        />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
