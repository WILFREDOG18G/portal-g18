import type { FormHTMLAttributes, ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
} & Pick<FormHTMLAttributes<HTMLFormElement>, "action" | "method">;

export default function FilterBar({
  children,
  className = "md:grid-cols-4",
  action,
  method = "get",
}: FilterBarProps) {
  return (
    <form
      action={action}
      method={method}
      className={`mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 ${className}`.trim()}
    >
      {children}
    </form>
  );
}