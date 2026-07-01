import { requireModuleAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { createSopDocument } from "./actions";

export default async function SopPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    message?: string;
    bu?: string;
    area?: string;
  };
}) {
  const profile = await requireModuleAccess("sop");
  const supabase = createClient();

  const selectedBu = searchParams?.bu ?? "";
  const selectedArea = searchParams?.area ?? "";

  const { data: businessUnits } = await supabase
    .from("business_units")
    .select("id,name")
    .order("name", { ascending: true });

  const { data: areas } = await supabase
    .from("areas")
    .select("id,name,business_unit_id")
    .order("name", { ascending: true });

  let docsQuery = supabase
    .from("sop_documents")
    .select("id,business_unit_id,area_id,title,description,version,file_url,created_at")
    .order("created_at", { ascending: false });

  if (selectedBu) docsQuery = docsQuery.eq("business_unit_id", selectedBu);
  if (selectedArea) docsQuery = docsQuery.eq("area_id", selectedArea);

  const { data: documents } = await docsQuery.limit(150);

  const businessUnitById = new Map((businessUnits ?? []).map((unit) => [unit.id, unit.name]));
  const areaById = new Map((areas ?? []).map((area) => [area.id, area.name]));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Modulo SOP</h1>
        <p className="mt-2 text-slate-600">Galeria de documentos por unidad y area, con upload real a Supabase Storage.</p>
        <p className="mt-1 text-sm text-slate-500">Sesion: {profile.full_name} ({profile.role})</p>
      </header>

      {searchParams?.error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{searchParams.error}</p>
      ) : null}

      {searchParams?.message ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{searchParams.message}</p>
      ) : null}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Subir SOP</h2>
        <form action={createSopDocument} className="mt-4 grid gap-4 md:grid-cols-2">
          <select name="businessUnitId" defaultValue={selectedBu} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">General (todas las unidades)</option>
            {(businessUnits ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>

          <select name="areaId" defaultValue={selectedArea} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">General (todas las areas)</option>
            {(areas ?? []).map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>

          <input name="title" required placeholder="Titulo del documento" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="version" placeholder="Version (ej. v1.0)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea name="description" rows={3} placeholder="Descripcion" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <input name="file" type="file" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Subir documento
            </button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Filtros de galeria</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3" action="/app/sop" method="get">
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
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Aplicar</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Galeria SOP</h2>
          <p className="text-sm text-slate-500">{(documents ?? []).length} documentos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Unidad</th>
                <th className="px-2 py-2 font-medium">Area</th>
                <th className="px-2 py-2 font-medium">Titulo</th>
                <th className="px-2 py-2 font-medium">Version</th>
                <th className="px-2 py-2 font-medium">Accion</th>
              </tr>
            </thead>
            <tbody>
              {(documents ?? []).map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 text-slate-700">{new Date(doc.created_at).toLocaleString()}</td>
                  <td className="px-2 py-2 text-slate-700">{doc.business_unit_id ? businessUnitById.get(doc.business_unit_id) ?? "-" : "General"}</td>
                  <td className="px-2 py-2 text-slate-700">{doc.area_id ? areaById.get(doc.area_id) ?? "-" : "General"}</td>
                  <td className="px-2 py-2 text-slate-900">{doc.title}</td>
                  <td className="px-2 py-2 text-slate-700">{doc.version ?? "-"}</td>
                  <td className="px-2 py-2">
                    <Link href={doc.file_url} target="_blank" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Abrir archivo
                    </Link>
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
