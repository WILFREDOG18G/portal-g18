import { signInWithPassword, signUpWithPassword } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const error = searchParams?.error;
  const message = searchParams?.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Grupo Dieciocho
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accede con tu cuenta de Supabase Auth.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        <form action={signInWithPassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 transition focus:ring-2"
              placeholder="tu-correo@dominio.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 transition focus:ring-2"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Entrar
          </button>
        </form>

        <div className="my-6 h-px w-full bg-slate-200" />

        <form action={signUpWithPassword} className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Crear cuenta inicial</h2>

          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 transition focus:ring-2"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="signupEmail" className="mb-1 block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              id="signupEmail"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 transition focus:ring-2"
              placeholder="nuevo-usuario@dominio.com"
            />
          </div>

          <div>
            <label htmlFor="signupPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Contrasena
            </label>
            <input
              id="signupPassword"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-600 transition focus:ring-2"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Registrar
          </button>
        </form>
      </section>
    </main>
  );
}
