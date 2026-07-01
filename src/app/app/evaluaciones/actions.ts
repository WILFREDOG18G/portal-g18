"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapProfile } from "@/lib/auth/profile";

function getTipPercentage(correctAnswers: number, totalQuestions: number) {
  if (totalQuestions <= 0) return 0;
  const scorePct = (correctAnswers / totalQuestions) * 100;

  if (scorePct >= 80) return 100;
  if (scorePct >= 60) return 75;
  if (scorePct >= 50) return 50;
  return 0;
}

async function getNextAttemptNumber(supabase: ReturnType<typeof createClient>, employeeId: string) {
  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select("attempt_number")
    .eq("employee_id", employeeId)
    .order("attempt_number", { ascending: false })
    .limit(1);

  if (error) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(error.message)}`);
  }

  const nextAttemptNumber = ((attempts?.[0]?.attempt_number as number | undefined) ?? 0) + 1;
  if (nextAttemptNumber > 5) {
    redirect("/app/evaluaciones?error=El+colaborador+ya+alcanzó+el+maximo+de+5+intentos");
  }

  return nextAttemptNumber;
}

async function insertQuizAttemptRecord({
  supabase,
  profileId,
  employeeId,
  businessUnitId,
  areaId,
  quizType,
  mode,
  totalQuestions,
  correctAnswers,
}: {
  supabase: ReturnType<typeof createClient>;
  profileId: string;
  employeeId: string;
  businessUnitId: string;
  areaId: string;
  quizType: string;
  mode: string;
  totalQuestions: number;
  correctAnswers: number;
}) {
  const attemptNumber = await getNextAttemptNumber(supabase, employeeId);
  const tipPercentage = getTipPercentage(correctAnswers, totalQuestions);
  const quizTypeStored = `${quizType}_${mode}`;

  const { error: insertError } = await supabase.from("quiz_attempts").insert({
    employee_id: employeeId,
    business_unit_id: businessUnitId,
    area_id: areaId,
    quiz_type: quizTypeStored,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    attempt_number: attemptNumber,
    tip_percentage: tipPercentage,
    registered_by: profileId,
  });

  if (insertError) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(insertError.message)}`);
  }

  return { attemptNumber, tipPercentage };
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
    redirect("/app/evaluaciones?error=El+area+seleccionada+no+es+valida");
  }

  if (area.business_unit_id !== businessUnitId) {
    redirect("/app/evaluaciones?error=El+area+no+pertenece+a+la+unidad+seleccionada");
  }
}

export async function createEmployee(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaIdRaw = String(formData.get("areaId") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const contractType = String(formData.get("contractType") ?? "").trim();
  const identificationNumber = String(formData.get("identificationNumber") ?? "").trim();
  const salaryRaw = String(formData.get("salary") ?? "").trim();

  if (!fullName || !businessUnitId || !position || !contractType) {
    redirect("/app/evaluaciones?error=Completa+los+campos+obligatorios");
  }

  const salary = salaryRaw ? Number(salaryRaw) : null;
  if (salaryRaw && Number.isNaN(salary)) {
    redirect("/app/evaluaciones?error=Salario+invalido");
  }

  const supabase = createClient();
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
    redirect(`/app/evaluaciones?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/evaluaciones");
  redirect("/app/evaluaciones?message=Colaborador+creado");
}

export async function updateEmployee(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaIdRaw = String(formData.get("areaId") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const contractType = String(formData.get("contractType") ?? "").trim();
  const identificationNumber = String(formData.get("identificationNumber") ?? "").trim();
  const salaryRaw = String(formData.get("salary") ?? "").trim();

  if (!employeeId || !fullName || !businessUnitId || !position || !contractType) {
    redirect("/app/evaluaciones?error=Completa+los+campos+obligatorios+para+editar");
  }

  const salary = salaryRaw ? Number(salaryRaw) : null;
  if (salaryRaw && Number.isNaN(salary)) {
    redirect("/app/evaluaciones?error=Salario+invalido");
  }

  const supabase = createClient();
  await validateAreaBelongsToBusinessUnit(supabase, areaIdRaw, businessUnitId);

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: fullName,
      business_unit_id: businessUnitId,
      area_id: areaIdRaw || null,
      position,
      contract_type: contractType,
      identification_number: identificationNumber || null,
      salary,
    })
    .eq("id", employeeId);

  if (error) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/evaluaciones");
  redirect("/app/evaluaciones?message=Colaborador+actualizado");
}

export async function toggleEmployeeStatus(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const currentStatus = String(formData.get("currentStatus") ?? "").trim();

  if (!employeeId || !currentStatus) {
    redirect("/app/evaluaciones?error=Datos+incompletos+para+actualizar+estado");
  }

  const nextStatus = currentStatus === "activo" ? "inactivo" : "activo";

  const supabase = createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: nextStatus })
    .eq("id", employeeId);

  if (error) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/evaluaciones");
  redirect(`/app/evaluaciones?message=Estado+actualizado+a+${nextStatus}`);
}

export async function startQuizAttempt(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "").trim();
  const quizType = String(formData.get("quizType") ?? "menu").trim() || "menu";
  const mode = String(formData.get("mode") ?? "practica").trim() || "practica";
  const questionCountRaw = String(formData.get("questionCount") ?? "20").trim();
  const questionCount = Number(questionCountRaw);

  if (!employeeId || !businessUnitId || !areaId) {
    redirect("/app/evaluaciones?error=Selecciona+colaborador,+unidad+y+area+para+iniciar+la+prueba");
  }

  if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 50) {
    redirect("/app/evaluaciones?error=La+cantidad+de+preguntas+debe+estar+entre+5+y+50");
  }

  const supabase = createClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id,status,business_unit_id,area_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !employee) {
    redirect("/app/evaluaciones?error=Colaborador+no+encontrado");
  }

  if (employee.status !== "activo") {
    redirect("/app/evaluaciones?error=Solo+puedes+evaluar+colaboradores+activos");
  }

  if (employee.business_unit_id !== businessUnitId || employee.area_id !== areaId) {
    redirect("/app/evaluaciones?error=El+colaborador+no+pertenece+a+la+unidad+o+area+seleccionada");
  }

  const params = new URLSearchParams({
    employeeId,
    bu: businessUnitId,
    area: areaId,
    quizType,
    mode,
    qCount: String(questionCount),
  });

  redirect(`/app/evaluaciones/examen?${params.toString()}`);
}

export async function submitQuizAttempt(formData: FormData) {
  const profile = await bootstrapProfile();
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "").trim();
  const quizType = String(formData.get("quizType") ?? "menu").trim() || "menu";
  const mode = String(formData.get("mode") ?? "practica").trim() || "practica";
  const questionIdsRaw = String(formData.get("questionIds") ?? "[]");

  if (!employeeId || !businessUnitId || !areaId) {
    redirect("/app/evaluaciones?error=No+se+pudo+registrar+el+intento+por+datos+incompletos");
  }

  let questionIds: string[] = [];
  try {
    const parsed = JSON.parse(questionIdsRaw);
    if (!Array.isArray(parsed)) {
      redirect("/app/evaluaciones?error=Formato+de+preguntas+invalido");
    }

    questionIds = parsed.map((id) => String(id ?? "").trim()).filter(Boolean);
  } catch {
    redirect("/app/evaluaciones?error=No+se+pudo+leer+las+preguntas+del+intento");
  }

  questionIds = Array.from(new Set(questionIds));
  if (questionIds.length < 5) {
    redirect("/app/evaluaciones?error=El+intento+debe+contener+al+menos+5+preguntas");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,status,business_unit_id,area_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    redirect("/app/evaluaciones?error=Colaborador+invalido+para+registrar+intento");
  }

  if (
    employee.status !== "activo" ||
    employee.business_unit_id !== businessUnitId ||
    employee.area_id !== areaId
  ) {
    redirect("/app/evaluaciones?error=El+colaborador+ya+no+cumple+las+condiciones+del+intento");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_banks")
    .select("id,correct_index,category,options,business_unit_id,area_id")
    .in("id", questionIds)
    .eq("business_unit_id", businessUnitId)
    .eq("area_id", areaId);

  if (questionsError) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(questionsError.message)}`);
  }

  if (!questions || questions.length !== questionIds.length) {
    redirect("/app/evaluaciones?error=No+se+pudo+validar+el+set+de+preguntas+respondidas");
  }

  const priceCount = questions.filter((question) => question.category === "precio").length;
  const maxPriceAllowed = Math.floor(questionIds.length * 0.1);
  if (priceCount > maxPriceAllowed) {
    redirect("/app/evaluaciones?error=El+intento+no+cumple+la+regla+de+maximo+10+por+ciento+de+preguntas+de+precio");
  }

  let correctAnswers = 0;
  for (const question of questions) {
    const answerRaw = String(formData.get(`answer_${question.id}`) ?? "").trim();
    const selectedIndex = Number(answerRaw);

    if (!Number.isInteger(selectedIndex)) {
      continue;
    }

    if (selectedIndex === question.correct_index) {
      correctAnswers += 1;
    }
  }

  const { attemptNumber, tipPercentage } = await insertQuizAttemptRecord({
    supabase,
    profileId: profile.id,
    employeeId,
    businessUnitId,
    areaId,
    quizType,
    mode,
    totalQuestions: questionIds.length,
    correctAnswers,
  });

  const scorePct = ((correctAnswers / questionIds.length) * 100).toFixed(1);
  revalidatePath("/app/evaluaciones");
  redirect(
    `/app/evaluaciones?message=${encodeURIComponent(
      `Intento #${attemptNumber} registrado. Resultado: ${correctAnswers}/${questionIds.length} (${scorePct}%). Propina aprobada: ${tipPercentage}%`
    )}`
  );
}

export async function createManualQuizAttempt(formData: FormData) {
  const profile = await bootstrapProfile();
  const supabase = createClient();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const quizType = String(formData.get("quizType") ?? "menu").trim() || "menu";
  const mode = String(formData.get("mode") ?? "manual").trim() || "manual";
  const totalQuestions = Number(String(formData.get("totalQuestions") ?? "0").trim());
  const correctAnswers = Number(String(formData.get("correctAnswers") ?? "0").trim());

  if (!employeeId || !Number.isInteger(totalQuestions) || totalQuestions <= 0 || !Number.isInteger(correctAnswers)) {
    redirect("/app/evaluaciones?error=Datos+invalidos+para+registro+manual");
  }

  if (correctAnswers < 0 || correctAnswers > totalQuestions) {
    redirect("/app/evaluaciones?error=Respuestas+correctas+deben+estar+entre+0+y+el+total");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,status,business_unit_id,area_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employee || employee.status !== "activo") {
    redirect("/app/evaluaciones?error=Colaborador+invalido+para+registro+manual");
  }

  if (!employee.area_id) {
    redirect("/app/evaluaciones?error=El+colaborador+debe+tener+area+asignada+para+registro+manual");
  }

  const { attemptNumber, tipPercentage } = await insertQuizAttemptRecord({
    supabase,
    profileId: profile.id,
    employeeId,
    businessUnitId: employee.business_unit_id,
    areaId: employee.area_id,
    quizType,
    mode,
    totalQuestions,
    correctAnswers,
  });

  const scorePct = ((correctAnswers / totalQuestions) * 100).toFixed(1);
  revalidatePath("/app/evaluaciones");
  redirect(
    `/app/evaluaciones?message=${encodeURIComponent(
      `Registro manual OK. Intento #${attemptNumber} ${correctAnswers}/${totalQuestions} (${scorePct}%), propina ${tipPercentage}%`
    )}`
  );
}

export async function reassignQuizAttemptEmployee(formData: FormData) {
  const profile = await bootstrapProfile();
  if (profile.role !== "admin") {
    redirect("/app/evaluaciones?error=Solo+admin+puede+editar+intentos+post-hoc");
  }

  const attemptId = String(formData.get("attemptId") ?? "").trim();
  const newEmployeeId = String(formData.get("newEmployeeId") ?? "").trim();

  if (!attemptId || !newEmployeeId) {
    redirect("/app/evaluaciones?error=Datos+incompletos+para+editar+el+intento");
  }

  const supabase = createClient();

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id,business_unit_id,area_id")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    redirect("/app/evaluaciones?error=Intento+no+encontrado");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,business_unit_id,area_id,status")
    .eq("id", newEmployeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    redirect("/app/evaluaciones?error=Colaborador+destino+no+encontrado");
  }

  if (employee.status !== "activo") {
    redirect("/app/evaluaciones?error=Solo+puedes+reasignar+a+colaboradores+activos");
  }

  if (employee.business_unit_id !== attempt.business_unit_id || employee.area_id !== attempt.area_id) {
    redirect("/app/evaluaciones?error=El+colaborador+destino+debe+pertenecer+a+la+misma+unidad+y+area+del+intento");
  }

  const { error: updateError } = await supabase
    .from("quiz_attempts")
    .update({ employee_id: newEmployeeId })
    .eq("id", attemptId);

  if (updateError) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(updateError.message)}`);
  }

  revalidatePath("/app/evaluaciones");
  redirect("/app/evaluaciones?message=Intento+reasignado+correctamente");
}
