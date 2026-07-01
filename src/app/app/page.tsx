import { signOut } from "@/app/auth/login/actions";
import { bootstrapProfile } from "@/lib/auth/profile";
import { canAccessModule } from "@/lib/auth/roles";
import Link from "next/link";

type ModuleCard = {
  key: "evaluaciones" | "rrhh" | "admin" | "sop";
  href: string;
  title: string;
  description: string;
  accentClass: string;
};

const moduleCards: ModuleCard[] = [
  {
    key: "evaluaciones",
    href: "/app/evaluaciones",
    title: "Evaluaciones",
    description: "Pruebas, intentos y reportes de desempeno.",
    accentClass: "from-emerald-700 to-emerald-500",
  },
  {
    key: "rrhh",
    href: "/app/rrhh",
    title: "RRHH",
    description: "Personal, incidencias, cartas y adelantos.",
    accentClass: "from-cyan-700 to-cyan-500",
  },
  {
    key: "admin",
    href: "/app/admin",
    title: "Admin",
    description: "Propinas, caja menuda y eventuales.",
    accentClass: "from-amber-700 to-amber-500",
  },
  {
    key: "sop",
    href: "/app/sop",
    title: "SOP",
    description: "Documentos operativos, versiones y consulta.",
    accentClass: "from-rose-700 to-rose-500",
  },
];

export default async function AppHomePage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const profile = await bootstrapProfile();
  const error = searchParams?.error;

  const visibleModules = moduleCards.filter((moduleCard) =>
    canAccessModule(profile.role, moduleCard.key)
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-6 sm:py-10">
      <header className="card-surface rise-in relative mb-8 overflow-hidden rounded-3xl border p-6 shadow-sm sm:p-7">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-200/60 blur-2xl" />
        <div className="absolute -bottom-16 left-1/2 h-40 w-40 rounded-full bg-amber-200/40 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Portal Grupo Dieciocho
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Centro Operativo
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
              Bienvenido, {profile.full_name}. Esta estacion centraliza evaluaciones,
              administracion, recursos humanos y SOP con acceso por rol.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Rol activo: {profile.role}
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </header>

      {error ? (
        <p className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleModules.map((moduleCard, index) => (
          <Link
            key={moduleCard.key}
            href={moduleCard.href}
            className="card-surface rise-in group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div
              className={`mb-4 h-2 w-16 rounded-full bg-gradient-to-r ${moduleCard.accentClass}`}
            />
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {moduleCard.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{moduleCard.description}</p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 transition group-hover:text-slate-800">
              Abrir modulo
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
