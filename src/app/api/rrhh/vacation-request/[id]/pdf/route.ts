import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderVacationRequestPdf } from "@/lib/pdf/rrhh";

type Params = { params: { id: string } };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const supabase = createClient();

  const { data: vacation, error: vacationError } = await supabase
    .from("vacation_requests")
    .select("id,employee_id,business_unit_id,start_date,end_date,total_days,reason,status,created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (vacationError || !vacation) {
    return NextResponse.json({ error: "No se encontro la solicitud de vacaciones" }, { status: 404 });
  }

  const [{ data: employee }, { data: businessUnit }] = await Promise.all([
    supabase
      .from("employees")
      .select("id,full_name,position,area_id")
      .eq("id", vacation.employee_id)
      .maybeSingle(),
    supabase
      .from("business_units")
      .select("id,name,razon_social,logo_color")
      .eq("id", vacation.business_unit_id)
      .maybeSingle(),
  ]);

  if (!employee || !businessUnit) {
    return NextResponse.json({ error: "No se pudo cargar la informacion relacionada" }, { status: 400 });
  }

  const { data: area } = employee.area_id
    ? await supabase.from("areas").select("id,name").eq("id", employee.area_id).maybeSingle()
    : { data: null };

  const buffer = await renderVacationRequestPdf({
    businessUnitName: businessUnit.name,
    razonSocial: businessUnit.razon_social,
    logoColor: businessUnit.logo_color,
    employeeName: employee.full_name,
    position: employee.position,
    areaName: area?.name,
    startDate: String(vacation.start_date),
    endDate: String(vacation.end_date),
    totalDays: Number(vacation.total_days ?? 0),
    reason: vacation.reason,
    status: vacation.status,
    requestDate: String(vacation.created_at ?? ""),
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="solicitud-vacaciones-${vacation.id}.pdf"`,
    },
  });
}
