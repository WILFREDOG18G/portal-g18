import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderWorkLetterPdf } from "@/lib/pdf/rrhh";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const supabase = createClient();

  const { data: letter, error: letterError } = await supabase
    .from("work_letters")
    .select("id,employee_id,business_unit_id,purpose,request_date,contract_type,hire_date_text,salary,weekly_tip_avg,identification")
    .eq("id", params.id)
    .maybeSingle();

  if (letterError || !letter) {
    return NextResponse.json({ error: "No se encontro la carta de trabajo" }, { status: 404 });
  }

  const [{ data: employee }, { data: businessUnit }] = await Promise.all([
    supabase
      .from("employees")
      .select("id,full_name,position")
      .eq("id", letter.employee_id)
      .maybeSingle(),
    supabase
      .from("business_units")
      .select("id,name,razon_social,logo_color")
      .eq("id", letter.business_unit_id)
      .maybeSingle(),
  ]);

  if (!employee || !businessUnit) {
    return NextResponse.json({ error: "No se pudo cargar la informacion relacionada" }, { status: 400 });
  }

  const buffer = await renderWorkLetterPdf({
    businessUnitName: businessUnit.name,
    razonSocial: businessUnit.razon_social,
    logoColor: businessUnit.logo_color,
    employeeName: employee.full_name,
    position: employee.position,
    contractType: letter.contract_type,
    purpose: letter.purpose,
    requestDate: String(letter.request_date),
    hireDateText: letter.hire_date_text,
    salary: Number(letter.salary ?? 0),
    weeklyTipAvg: Number(letter.weekly_tip_avg ?? 0),
    identification: letter.identification,
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="carta-trabajo-${letter.id}.pdf"`,
    },
  });
}
