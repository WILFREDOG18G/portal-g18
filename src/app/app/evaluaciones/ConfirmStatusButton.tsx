"use client";

type ConfirmStatusButtonProps = {
  employeeName: string;
  label: string;
};

export default function ConfirmStatusButton({ employeeName, label }: ConfirmStatusButtonProps) {
  return (
    <button
      type="submit"
      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      onClick={(event) => {
        const typed = window.prompt(`Confirma escribiendo el nombre completo: ${employeeName}`) ?? "";
        if (typed.trim().toLowerCase() !== employeeName.trim().toLowerCase()) {
          event.preventDefault();
          window.alert("Nombre no coincide. Accion cancelada.");
        }
      }}
    >
      {label}
    </button>
  );
}
