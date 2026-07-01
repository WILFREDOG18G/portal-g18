import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderLoanRequestPdf } from "@/lib/pdf/rrhh";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const supabase = createClient();

  const { data: loan, error: loanError } = await supabase
    .from("loan_requests")
    .select("id,employee_id,business_unit_id,amount,installment_amount,installments_count,last_installment_amount,reason,request_date")
    .eq("id", params.id)
    .maybeSingle();

  if (loanError || !loan) {
    return NextResponse.json({ error: "No se encontro la solicitud de adelanto" }, { status: 404 });
  }

  const [{ data: employee }, { data: businessUnit }] = await Promise.all([
    supabase
      .from("employees")
      .select("id,full_name,position,area_id")
      .eq("id", loan.employee_id)
      .maybeSingle(),
    supabase
      .from("business_units")
      .select("id,name,razon_social,logo_color")
      .eq("id", loan.business_unit_id)
      .maybeSingle(),
  ]);

  if (!employee || !businessUnit) {
    return NextResponse.json({ error: "No se pudo cargar la informacion relacionada" }, { status: 400 });
  }

  const { data: area } = employee.area_id
    ? await supabase.from("areas").select("id,name").eq("id", employee.area_id).maybeSingle()
    : { data: null };

  const buffer = await renderLoanRequestPdf({
    businessUnitName: businessUnit.name,
    razonSocial: businessUnit.razon_social,
    logoColor: businessUnit.logo_color,
    employeeName: employee.full_name,
    position: employee.position,
    areaName: area?.name,
    amount: Number(loan.amount ?? 0),
    installmentAmount: Number(loan.installment_amount ?? 0),
    installmentsCount: Number(loan.installments_count ?? 0),
    lastInstallmentAmount: Number(loan.last_installment_amount ?? 0),
    reason: loan.reason,
    requestDate: String(loan.request_date),
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="solicitud-adelanto-${loan.id}.pdf"`,
    },
  });
}
