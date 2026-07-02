import SectionCard from "@/components/ui/SectionCard";

type UnitAttempt = {
  id: string;
  name: string;
  attempts: number;
};

type ReportsOverviewProps = {
  distinctAttemptEmployees: number;
  attemptsCount: number;
  pendingEvaluations: number;
  averageScorePct: number;
  unitAttempts: UnitAttempt[];
};

export default function ReportsOverview({
  distinctAttemptEmployees,
  attemptsCount,
  pendingEvaluations,
  averageScorePct,
  unitAttempts,
}: ReportsOverviewProps) {
  return (
    <section className="mb-8 grid gap-4 md:grid-cols-2">
      <SectionCard title="Reportes rapidos">
        <div className="space-y-2 text-sm text-slate-700">
          <p>Por colaborador: {distinctAttemptEmployees} con historial de intentos.</p>
          <p>Historial total: {attemptsCount} intentos acumulados.</p>
          <p>Pendientes de evaluar: {pendingEvaluations} colaboradores activos sin intento.</p>
          <p>Promedio global: {averageScorePct.toFixed(1)}% de respuestas correctas.</p>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Por unidad</p>
          {unitAttempts.map((unit) => (
            <p key={unit.id}>
              {unit.name}: {unit.attempts} intentos
            </p>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Escala de propinas">
        <div className="overflow-x-auto">
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
      </SectionCard>
    </section>
  );
}
