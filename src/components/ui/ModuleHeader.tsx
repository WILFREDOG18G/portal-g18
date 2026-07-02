import type { ReactNode } from "react";
import Link from "next/link";

type ModuleHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  meta?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  showBackButton?: boolean;
};

export default function ModuleHeader({
  title,
  description,
  eyebrow = "Modulo",
  meta,
  actions,
  backHref = "/app",
  backLabel = "Regresar",
  showBackButton = true,
}: ModuleHeaderProps) {
  return (
    <header className="card-surface rise-in mb-8 rounded-3xl border p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-700">{description}</p>
          {meta ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {meta}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showBackButton ? (
            <Link
              href={backHref}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              {backLabel}
            </Link>
          ) : null}
          {actions ? <div>{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}