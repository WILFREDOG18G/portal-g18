"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

function parseAmount(value: string, fieldName: string) {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    redirect(`/app/admin?error=${encodeURIComponent(`${fieldName} invalido`)}`);
  }
  return amount;
}

export async function createTipRecord(formData: FormData) {
  const profile = await bootstrapProfile();
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const shift = String(formData.get("shift") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!employeeId || !businessUnitId || !shift || !date || !amountRaw) {
    redirect("/app/admin?error=Completa+los+campos+obligatorios+de+propina");
  }

  const amount = parseAmount(amountRaw, "Monto de propina");

  const { error } = await supabase.from("tips_records").insert({
    employee_id: employeeId,
    business_unit_id: businessUnitId,
    shift,
    amount,
    date,
    notes: notes || null,
    registered_by: profile.id,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin?message=Propina+registrada");
}

export async function createPettyCashRecord(formData: FormData) {
  const supabase = createClient();

  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const responsible = String(formData.get("responsible") ?? "").trim();

  if (!businessUnitId || !category || !amountRaw || !date) {
    redirect("/app/admin?error=Completa+los+campos+obligatorios+de+caja+menuda");
  }

  const amount = parseAmount(amountRaw, "Monto de caja menuda");

  const { error } = await supabase.from("petty_cash_records").insert({
    business_unit_id: businessUnitId,
    category,
    amount,
    date,
    description: description || null,
    responsible: responsible || null,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin?message=Movimiento+de+caja+menuda+registrado");
}

export async function createTempStaffRecord(formData: FormData) {
  const supabase = createClient();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !businessUnitId || !eventType || !eventDate || !hourlyRateRaw) {
    redirect("/app/admin?error=Completa+los+campos+obligatorios+de+eventuales");
  }

  const hourlyRate = parseAmount(hourlyRateRaw, "Tarifa por hora");

  let hoursCalculated: number | null = null;
  let totalAmount: number | null = null;

  if (startTime && endTime) {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      redirect("/app/admin?error=Rango+de+hora+invalido+en+eventuales");
    }

    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    hoursCalculated = Math.round(diffHours * 100) / 100;
    totalAmount = Math.round(hoursCalculated * hourlyRate * 100) / 100;
  }

  const { error } = await supabase.from("temp_staff_records").insert({
    full_name: fullName,
    business_unit_id: businessUnitId,
    area_id: areaId || null,
    event_type: eventType,
    event_date: eventDate,
    start_time: startTime || null,
    end_time: endTime || null,
    hourly_rate: hourlyRate,
    hours_calculated: hoursCalculated,
    total_amount: totalAmount,
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin?message=Eventual+registrado");
}
