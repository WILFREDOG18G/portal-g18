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

type BusinessUnitCard = {
  name: string;
  tagline: string;
  description: string;
  surfaceClass: string;
  badge: string;
  palette: string[];
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

const businessUnitCards: BusinessUnitCard[] = [
  {
    name: "ARIA",
    tagline: "Hospitalidad precisa",
    description: "Servicio afinado, operacion sobria y una mesa con ritmo alto.",
    surfaceClass: "unit-aria",
    badge: "Fine Dining",
    palette: ["#314f3d", "#8ea98f", "#f1ece2"],
  },
  {
    name: "KAVA",
    tagline: "Sushi bar nocturno",
    description: "Una identidad intensa con contraste alto, fotografia gastronomica oscura y acentos especiados.",
    surfaceClass: "unit-kava",
    badge: "Concept Brand",
    palette: ["#2E5239", "#B97735", "#FFFFFF", "#000000"],
  },
  {
    name: "SHEVA CATERING",
    tagline: "Produccion en escala",
    description: "Eventos, coordinacion y estandarizacion con presencia de marca.",
    surfaceClass: "unit-sheva",
    badge: "Events",
    palette: ["#7c6325", "#d6b674", "#f4efe4"],
  },
  {
    name: "SIMJATI",
    tagline: "Calidez contemporanea",
    description: "Una expresion mas reservada, cuidada y de atmosfera propia.",
    surfaceClass: "unit-simjati",
    badge: "Signature",
    palette: ["#4d3c76", "#b7a4e6", "#efeaf8"],
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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-6 sm:py-10">
      <header className="rise-in relative mb-8 overflow-hidden rounded-[2rem] border border-slate-900/10 bg-[#1f1d1a] px-6 py-8 text-stone-100 shadow-xl sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(217,191,142,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(97,146,120,0.26),_transparent_26%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-300/80">
              Grupo Dieciocho
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold uppercase leading-[0.92] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Operacion,
              <br />
              Hospitalidad
              <br />
              y Marca
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-stone-200/85 sm:text-base">
              Un tablero central para coordinar personas, evaluaciones, procesos y documentos
              bajo una misma narrativa visual para ARIA, KAVA, SHEVA CATERING y SIMJATI.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-300/80">
              Sesion activa
            </p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">
              {profile.full_name}
            </p>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-stone-300">
              {profile.role}
            </p>
            <form action={signOut} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/18"
              >
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      </header>

      {error ? (
        <p className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="mb-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Unidades de negocio
            </p>
            <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-slate-900">
              Escena de Marca
            </h2>
          </div>
          <p className="max-w-xl text-right text-sm text-slate-600">
            Esta seccion esta preparada para reemplazar fondos abstractos por imagenes reales
            o assets oficiales de cada marca cuando me los compartas.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {businessUnitCards.map((unit, index) => (
            <article
              key={unit.name}
              className={`rise-in ${unit.surfaceClass} group relative min-h-[240px] overflow-hidden rounded-[1.75rem] border border-white/10 p-6 text-white shadow-lg`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                    {unit.badge}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                    Brand Panel
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                    {unit.tagline}
                  </p>
                  <h3 className="mt-2 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
                    {unit.name}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/82">
                    {unit.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {unit.palette.map((color) => (
                      <span
                        key={color}
                        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/88 backdrop-blur-sm"
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-white/25"
                          style={{ backgroundColor: color }}
                        />
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
            Modulos
          </p>
          <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-slate-900">
            Acceso Operativo
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleModules.map((moduleCard, index) => (
          <Link
            key={moduleCard.key}
            href={moduleCard.href}
            className="card-surface rise-in group relative overflow-hidden rounded-[1.6rem] border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${index * 70 + 160}ms` }}
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
        </div>
      </section>
    </main>
  );
}
