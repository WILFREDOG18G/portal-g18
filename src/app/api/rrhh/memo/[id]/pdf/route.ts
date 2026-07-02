import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderMemoPdf } from "@/lib/pdf/rrhh";

type Params = { params: { id: string } };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const supabase = createClient();

  const { data: memo, error: memoError } = await supabase
    .from("memos")
    .select("id,target_employee_id,business_unit_id,memo_type,subject,body,date,status")
    .eq("id", params.id)
    .maybeSingle();

  if (memoError || !memo) {
    return NextResponse.json({ error: "No se encontro el memo" }, { status: 404 });
  }

  const [{ data: employee }, { data: businessUnit }] = await Promise.all([
    memo.target_employee_id
      ? supabase.from("employees").select("id,full_name").eq("id", memo.target_employee_id).maybeSingle()
      : Promise.resolve({ data: null }),
    memo.business_unit_id
      ? supabase
          .from("business_units")
          .select("id,name,razon_social,logo_color")
          .eq("id", memo.business_unit_id)
          .maybeSingle()
      : Promise.resolve({
          data: {
            id: "",
            name: "Todas las unidades",
            razon_social: "Grupo Dieciocho",
            logo_color: "#7f1d1d",
          },
        }),
  ]);

  if (!businessUnit) {
    return NextResponse.json({ error: "No se pudo cargar la informacion relacionada" }, { status: 400 });
  }

  const buffer = await renderMemoPdf({
    businessUnitName: businessUnit.name,
    razonSocial: businessUnit.razon_social,
    logoColor: businessUnit.logo_color,
    memoType: memo.memo_type,
    subject: memo.subject,
    body: memo.body,
    date: String(memo.date),
    status: memo.status,
    targetEmployeeName: employee?.full_name,
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="memo-${memo.id}.pdf"`,
    },
  });
}
