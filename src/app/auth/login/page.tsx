import { signInWithPassword, signUpWithPassword } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const error = searchParams?.error;
  const message = searchParams?.message;

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-5 py-8 sm:px-6 lg:grid-cols-12">
      <section className="card-surface rise-in relative overflow-hidden rounded-3xl border p-7 shadow-sm lg:col-span-5 lg:p-8">
        <div className="absolute -left-14 top-10 h-32 w-32 rounded-full bg-emerald-200/60 blur-2xl" />
        <div className="absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-amber-200/50 blur-2xl" />

        <div className="relative z-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-slate-500">
            Grupo Dieciocho
          </p>
          <h1 className="mt-3 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-slate-900 sm:text-5xl">
            Cocina,
            <br />
            Servicio,
            <br />
            Control
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-700">
            Plataforma interna para operar evaluaciones, RRHH, administracion y SOP
            con una sola identidad digital.
          </p>
          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Portal operativo corporativo
          </p>
        </div>
      </section>

      <section className="rise-in rounded-3xl border border-slate-900/15 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-7 lg:col-span-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Acceso
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
            Iniciar sesion
          </h2>
          <p className="mt-1 text-sm text-slate-600">Accede con tu cuenta de Supabase Auth.</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {message}
          </p>
        ) : null}

        <form action={signInWithPassword} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label htmlFor="email" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900"
              placeholder="tu-correo@dominio.com"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="sm:col-span-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
          >
            Entrar
          </button>
        </form>

        <div className="my-6 h-px w-full bg-slate-200" />

        <form action={signUpWithPassword} className="grid gap-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
            Crear cuenta inicial
          </h3>

          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="signupEmail" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              Correo
            </label>
            <input
              id="signupEmail"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900"
              placeholder="nuevo-usuario@dominio.com"
            />
          </div>

          <div>
            <label htmlFor="signupPassword" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              Contrasena
            </label>
            <input
              id="signupPassword"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            className="sm:col-span-2 rounded-xl border border-slate-800 bg-white px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-900 transition hover:bg-slate-50"
          >
            Registrar
          </button>
        </form>
      </section>
    </main>
  );
}
