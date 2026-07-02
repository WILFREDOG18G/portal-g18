import type { ReactNode } from "react";

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({
  id,
  title,
  description,
  actions,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section id={id} className={`card-surface rise-in rounded-2xl border p-5 shadow-sm ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}