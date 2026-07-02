type MetricsGridProps = {
  activeEmployeesCount: number;
  inactiveEmployeesCount: number;
  attemptsCount: number;
  pendingEvaluations: number;
};

export default function MetricsGrid({
  activeEmployeesCount,
  inactiveEmployeesCount,
  attemptsCount,
  pendingEvaluations,
}: MetricsGridProps) {
  return (
    <section className="mb-8 grid gap-3 md:grid-cols-4">
      <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Activos</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{activeEmployeesCount}</p>
      </article>
      <article className="card-surface rise-in rounded-2xl border p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Inactivos</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{inactiveEmployeesCount}</p>
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
  );
}
