import { signOut } from "@/app/auth/login/actions";
import { bootstrapProfile } from "@/lib/auth/profile";
import { canAccessModule } from "@/lib/auth/roles";

export default async function AppHomePage() {
  const profile = await bootstrapProfile();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Portal Grupo Dieciocho
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Inicio</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sesion iniciada como {profile.full_name} ({profile.role}).
          </p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar sesion
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canAccessModule(profile.role, "evaluaciones") ? (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Evaluaciones</h2>
            <p className="mt-2 text-sm text-slate-600">Pruebas y resultados.</p>
          </article>
        ) : null}

        {canAccessModule(profile.role, "rrhh") ? (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">RRHH</h2>
            <p className="mt-2 text-sm text-slate-600">Personal y procesos RRHH.</p>
          </article>
        ) : null}

        {canAccessModule(profile.role, "admin") ? (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Admin</h2>
            <p className="mt-2 text-sm text-slate-600">Propinas, caja y eventuales.</p>
          </article>
        ) : null}

        {canAccessModule(profile.role, "sop") ? (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">SOP</h2>
            <p className="mt-2 text-sm text-slate-600">Documentos y versiones.</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
