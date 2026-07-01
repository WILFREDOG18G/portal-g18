"use client";

import { useMemo, useState } from "react";

type QuizQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctIndex?: number;
};

type QuizQuestionListProps = {
  questions: QuizQuestion[];
  showPracticeFeedback: boolean;
};

export default function QuizQuestionList({ questions, showPracticeFeedback }: QuizQuestionListProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const answeredCount = useMemo(
    () => questions.filter((question) => Number.isInteger(answers[question.id])).length,
    [answers, questions]
  );

  return (
    <section className="space-y-4">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Respondidas: {answeredCount}/{questions.length}
      </p>

      {questions.map((question, index) => {
        const selected = answers[question.id];
        const hasAnswer = Number.isInteger(selected);
        const isCorrect = hasAnswer && selected === question.correctIndex;
        const shouldShowFeedback = showPracticeFeedback && hasAnswer && Number.isInteger(question.correctIndex);

        return (
          <article key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              {index + 1}. {question.questionText}
            </p>

            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <label
                  key={`${question.id}-${optionIndex}`}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name={`answer_${question.id}`}
                    value={optionIndex}
                    checked={selected === optionIndex}
                    onChange={() => {
                      setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
                    }}
                    required
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            {shouldShowFeedback ? (
              <p className={`mt-3 text-xs font-medium ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                {isCorrect
                  ? "Correcta"
                  : `Incorrecta. Respuesta correcta: ${question.options[question.correctIndex ?? 0]}`}
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
