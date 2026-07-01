"use client";

export default function PrintReportsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Exportar reportes (PDF)
    </button>
  );
}
