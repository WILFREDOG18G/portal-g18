import Link from "next/link";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { submitQuizAttempt } from "../actions";
import QuizQuestionList from "./QuizQuestionList";

type QuizQuestionRow = {
  id: string;
  question_text: string;
  options: unknown;
  correct_index: number;
  category: "precio" | "gastronomico";
};

type PreparedQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  category: "precio" | "gastronomico";
};

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

function addNoSeOption(question: QuizQuestionRow): PreparedQuestion | null {
  const baseOptions = parseOptions(question.options);
  if (baseOptions.length < 2) return null;
  if (question.correct_index < 0 || question.correct_index >= baseOptions.length) return null;

  const pairs = baseOptions.map((option, index) => ({ option, isCorrect: index === question.correct_index }));
  const shuffledPairs = shuffleArray(pairs);
  const shuffledOptions = shuffledPairs.map((pair) => pair.option);
  shuffledOptions.push("No se");

  const correctIndex = shuffledPairs.findIndex((pair) => pair.isCorrect);
  if (correctIndex < 0) return null;

  return {
    id: question.id,
    questionText: question.question_text,
    options: shuffledOptions,
    correctIndex,
    category: question.category,
  };
}

export default async function ExamenPage({
  searchParams,
}: {
  searchParams?: {
    employeeId?: string;
    bu?: string;
    area?: string;
    quizType?: string;
    mode?: string;
    qCount?: string;
  };
}) {
  const profile = await requireModuleAccess("evaluaciones");
  const supabase = createClient();

  const employeeId = searchParams?.employeeId ?? "";
  const businessUnitId = searchParams?.bu ?? "";
  const areaId = searchParams?.area ?? "";
  const quizType = searchParams?.quizType ?? "menu";
  const mode = searchParams?.mode ?? "practica";
  const requestedCount = Number(searchParams?.qCount ?? "20");

  if (!employeeId || !businessUnitId || !areaId) {
    redirect("/app/evaluaciones?error=Datos+insuficientes+para+iniciar+la+prueba");
  }

  if (!Number.isInteger(requestedCount) || requestedCount < 5 || requestedCount > 50) {
    redirect("/app/evaluaciones?error=La+cantidad+de+preguntas+debe+estar+entre+5+y+50");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,full_name,position,status,business_unit_id,area_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    redirect("/app/evaluaciones?error=Colaborador+no+encontrado+para+la+prueba");
  }

  if (
    employee.status !== "activo" ||
    employee.business_unit_id !== businessUnitId ||
    employee.area_id !== areaId
  ) {
    redirect("/app/evaluaciones?error=El+colaborador+no+cumple+condiciones+para+la+prueba");
  }

  const { data: questionRows, error: questionsError } = await supabase
    .from("quiz_banks")
    .select("id,question_text,options,correct_index,category")
    .eq("business_unit_id", businessUnitId)
    .eq("area_id", areaId);

  if (questionsError) {
    redirect(`/app/evaluaciones?error=${encodeURIComponent(questionsError.message)}`);
  }

  const allQuestions = (questionRows ?? []) as QuizQuestionRow[];
  const priceQuestions = allQuestions.filter((q) => q.category === "precio");
  const nonPriceQuestions = allQuestions.filter((q) => q.category !== "precio");

  const maxPriceAllowed = Math.floor(requestedCount * 0.1);
  const selectedPrice = shuffleArray(priceQuestions).slice(0, Math.min(maxPriceAllowed, priceQuestions.length));
  const neededNonPrice = requestedCount - selectedPrice.length;

  if (nonPriceQuestions.length < neededNonPrice) {
    redirect("/app/evaluaciones?error=No+hay+suficientes+preguntas+gastronomicas+para+cumplir+la+regla+del+10+por+ciento+de+precio");
  }

  const selectedNonPrice = shuffleArray(nonPriceQuestions).slice(0, neededNonPrice);
  const selectedQuestions = shuffleArray([...selectedPrice, ...selectedNonPrice]);

  if (selectedQuestions.length !== requestedCount) {
    redirect("/app/evaluaciones?error=No+se+pudo+armar+la+prueba+con+la+cantidad+solicitada");
  }

  const preparedQuestions = selectedQuestions
    .map(addNoSeOption)
    .filter((question): question is PreparedQuestion => question !== null);

  if (preparedQuestions.length !== requestedCount) {
    redirect("/app/evaluaciones?error=Hay+preguntas+invalidas+en+el+banco+de+preguntas+seleccionado");
  }

  const priceInExam = preparedQuestions.filter((question) => question.category === "precio").length;
  const pricePct = (priceInExam / preparedQuestions.length) * 100;
  const showPracticeFeedback = mode === "practica";

  const uiQuestions = preparedQuestions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    options: question.options,
    correctIndex: showPracticeFeedback ? question.correctIndex : undefined,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Intento de prueba</h1>
          <p className="mt-1 text-sm text-slate-600">
            Colaborador: {employee.full_name} · Cargo: {employee.position}
          </p>
          <p className="text-sm text-slate-500">
            Tipo: {quizType} · Modalidad: {mode} · Usuario: {profile.full_name}
          </p>
        </div>
        <Link href="/app/evaluaciones" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Volver a Evaluaciones
        </Link>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p>Total de preguntas: {preparedQuestions.length}</p>
        <p>Preguntas de precio en intento: {priceInExam} ({pricePct.toFixed(1)}%)</p>
        <p>Limite maximo permitido de precio: {maxPriceAllowed}</p>
      </section>

      <form action={submitQuizAttempt} className="space-y-4">
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="businessUnitId" value={businessUnitId} />
        <input type="hidden" name="areaId" value={areaId} />
        <input type="hidden" name="quizType" value={quizType} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="questionIds" value={JSON.stringify(preparedQuestions.map((question) => question.id))} />

        <QuizQuestionList questions={uiQuestions} showPracticeFeedback={showPracticeFeedback} />

        <div className="sticky bottom-4 flex justify-end">
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Finalizar y registrar intento
          </button>
        </div>
      </form>
    </main>
  );
}
