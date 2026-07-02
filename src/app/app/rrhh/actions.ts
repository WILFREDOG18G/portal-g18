"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parsePositiveAmount(rawValue: string, fieldName: string) {
  const amount = Number(rawValue);
  if (Number.isNaN(amount) || amount <= 0) {
    redirect(`/app/rrhh?error=${encodeURIComponent(`${fieldName} invalido`)}`);
  }
  return amount;
}

async function validateAreaBelongsToBusinessUnit(
  supabase: ReturnType<typeof createClient>,
  areaId: string,
  businessUnitId: string
) {
  if (!areaId) return;

  const { data: area, error } = await supabase
    .from("areas")
    .select("id,business_unit_id")
    .eq("id", areaId)
    .maybeSingle();

  if (error || !area) {
    redirect("/app/rrhh?error=El+area+seleccionada+no+es+valida");
  }

  if (area.business_unit_id !== businessUnitId) {
    redirect("/app/rrhh?error=El+area+no+pertenece+a+la+unidad+seleccionada");
  }
}

export async function createEmployeeRecord(formData: FormData) {
  const supabase = createClient();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaIdRaw = String(formData.get("areaId") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const contractType = String(formData.get("contractType") ?? "").trim();
  const identificationNumber = String(formData.get("identificationNumber") ?? "").trim();
  const salaryRaw = String(formData.get("salary") ?? "").trim();

  if (!fullName || !businessUnitId || !position || !contractType) {
    redirect("/app/rrhh?error=Completa+los+campos+obligatorios+de+personal");
  }

  const salary = salaryRaw ? Number(salaryRaw) : null;
  if (salaryRaw && Number.isNaN(salary)) {
    redirect("/app/rrhh?error=Salario+invalido");
  }

  if (contractType !== "SIPE" && contractType !== "SP") {
    redirect("/app/rrhh?error=Tipo+de+contrato+invalido");
  }

  await validateAreaBelongsToBusinessUnit(supabase, areaIdRaw, businessUnitId);

  const { error } = await supabase.from("employees").insert({
    full_name: fullName,
    business_unit_id: businessUnitId,
    area_id: areaIdRaw || null,
    position,
    status: "activo",
    contract_type: contractType,
    identification_number: identificationNumber || null,
    salary,
  });

  if (error) {
    redirect(`/app/rrhh?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/rrhh");
  redirect("/app/rrhh?message=Colaborador+registrado+en+RRHH");
}

export async function createPayrollIncident(formData: FormData) {
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const payPeriod = String(formData.get("payPeriod") ?? "").trim();
  const month = Number(String(formData.get("month") ?? "0").trim());
  const year = Number(String(formData.get("year") ?? "0").trim());
  const incidentType = String(formData.get("incidentType") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!employeeId || !businessUnitId || !payPeriod || !incidentType || !month || !year) {
    redirect("/app/rrhh?error=Completa+los+campos+obligatorios+de+incidencias");
  }

  const quantity = quantityRaw ? Number(quantityRaw) : null;
  if (quantityRaw && Number.isNaN(quantity)) {
    redirect("/app/rrhh?error=Cantidad+de+incidencia+invalida");
  }

  const { error } = await supabase.from("payroll_incidents").insert({
    employee_id: employeeId,
    business_unit_id: businessUnitId,
    pay_period: payPeriod,
    month,
    year,
    incident_type: incidentType,
    quantity,
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/rrhh?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/rrhh");
  redirect("/app/rrhh?message=Incidencia+registrada");
}

export async function createLoanRequest(formData: FormData) {
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const installmentAmountRaw = String(formData.get("installmentAmount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const requestDate = String(formData.get("requestDate") ?? "").trim();

  if (!employeeId || !businessUnitId || !amountRaw || !installmentAmountRaw) {
    redirect("/app/rrhh?error=Completa+los+campos+obligatorios+de+adelantos");
  }

  const amount = parsePositiveAmount(amountRaw, "Monto de adelanto");
  const installmentAmount = Number(installmentAmountRaw);
  if (installmentAmount !== 50 && installmentAmount !== 100) {
    redirect("/app/rrhh?error=La+cuota+debe+ser+50+o+100");
  }

  const installmentsCount = Math.ceil(amount / installmentAmount);
  const paidByFullInstallments = installmentAmount * (installmentsCount - 1);
  const lastInstallmentAmount = Math.round((amount - paidByFullInstallments) * 100) / 100;

  const { error } = await supabase.from("loan_requests").insert({
    employee_id: employeeId,
    business_unit_id: businessUnitId,
    amount,
    installment_amount: installmentAmount,
    installments_count: installmentsCount,
    last_installment_amount: lastInstallmentAmount,
    reason: reason || null,
    request_date: requestDate || undefined,
    status: "pendiente",
  });

  if (error) {
    redirect(`/app/rrhh?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/rrhh");
  redirect("/app/rrhh?message=Solicitud+de+adelanto+registrada");
}

export async function createWorkLetterRequest(formData: FormData) {
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const requestDate = String(formData.get("requestDate") ?? "").trim();
  const hireDateText = String(formData.get("hireDateText") ?? "").trim();
  const salaryRaw = String(formData.get("salary") ?? "").trim();
  const weeklyTipAvgRaw = String(formData.get("weeklyTipAvg") ?? "").trim();
  const identification = String(formData.get("identification") ?? "").trim();

  if (!employeeId) {
    redirect("/app/rrhh?error=Selecciona+un+colaborador+para+carta+de+trabajo");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,business_unit_id,contract_type,identification_number,salary,hire_date")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    redirect("/app/rrhh?error=Colaborador+invalido+para+carta+de+trabajo");
  }

  const salary = salaryRaw ? Number(salaryRaw) : employee.salary;
  if (salaryRaw && Number.isNaN(salary)) {
    redirect("/app/rrhh?error=Salario+invalido+en+carta+de+trabajo");
  }

  const weeklyTipAvg = weeklyTipAvgRaw ? Number(weeklyTipAvgRaw) : null;
  if (weeklyTipAvgRaw && Number.isNaN(weeklyTipAvg)) {
    redirect("/app/rrhh?error=Propina+semanal+invalida+en+carta+de+trabajo");
  }

  const { error } = await supabase.from("work_letters").insert({
    employee_id: employee.id,
    business_unit_id: employee.business_unit_id,
    purpose: purpose || null,
    request_date: requestDate || undefined,
    contract_type: employee.contract_type,
    hire_date_text: hireDateText || (employee.hire_date ? String(employee.hire_date) : null),
    salary: salary ?? null,
    weekly_tip_avg: weeklyTipAvg,
    identification: identification || employee.identification_number || null,
    status: "pendiente",
  });

  if (error) {
    redirect(`/app/rrhh?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/rrhh");
  redirect("/app/rrhh?message=Solicitud+de+carta+de+trabajo+registrada");
}

export async function createMemo(formData: FormData) {
  const supabase = createClient();

  const targetEmployeeId = String(formData.get("targetEmployeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const memoType = String(formData.get("memoType") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!memoType || !subject || !body) {
    redirect("/app/rrhh?error=Completa+los+campos+obligatorios+de+memos");
  }

  const { error } = await supabase.from("memos").insert({
    target_employee_id: targetEmployeeId || null,
    business_unit_id: businessUnitId || null,
    memo_type: memoType,
    subject,
    body,
    date: date || undefined,
    status: status || null,
  });

  if (error) {
    redirect(`/app/rrhh?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/rrhh");
  redirect("/app/rrhh?message=Memo+registrado");
}

export async function createVacationRequest(formData: FormData) {
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const totalDaysRaw = String(formData.get("totalDays") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!employeeId || !businessUnitId || !startDate || !endDate) {
    redirect("/app/rrhh?error=Completa+los+campos+obligatorios+de+vacaciones");
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    redirect("/app/rrhh?error=Rango+de+fechas+invalido+para+vacaciones");
  }

  const diffMs = end.getTime() - start.getTime();
  const computedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = totalDaysRaw ? Number(totalDaysRaw) : computedDays;
  if (Number.isNaN(totalDays) || totalDays <= 0) {
    redirect("/app/rrhh?error=Total+de+dias+invalido+para+vacaciones");
  }

  const { error } = await supabase.from("vacation_requests").insert({
    employee_id: employeeId,
    business_unit_id: businessUnitId,
    start_date: startDate,
    end_date: endDate,
    total_days: totalDays,
    reason: reason || null,
    status: "pendiente",
  });

  if (error) {
    redirect(`/app/rrhh?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/rrhh");
  redirect("/app/rrhh?message=Solicitud+de+vacaciones+registrada");
}
