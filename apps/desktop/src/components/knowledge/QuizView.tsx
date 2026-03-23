import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { QuizQuestion } from "@focus-shield/knowledge";
import { StudyProgress } from "./StudyProgress";
import { StudyComplete } from "./StudyComplete";

interface QuizViewProps {
  questions: QuizQuestion[];
  startTime: number;
  onComplete: (correct: number, wrong: number) => void;
}

export function QuizView({ questions, startTime, onComplete }: QuizViewProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[currentIndex];

  const handleSelect = useCallback(
    (choiceIndex: number) => {
      if (selectedIndex !== null || !question) return;
      setSelectedIndex(choiceIndex);

      const isCorrect = choiceIndex === question.correctIndex;
      if (isCorrect) {
        setCorrect((c) => c + 1);
      } else {
        setWrong((w) => w + 1);
      }

      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          const finalCorrect = correct + (isCorrect ? 1 : 0);
          const finalWrong = wrong + (isCorrect ? 0 : 1);
          setFinished(true);
          onComplete(finalCorrect, finalWrong);
        } else {
          setCurrentIndex((i) => i + 1);
          setSelectedIndex(null);
        }
      }, 1200);
    },
    [selectedIndex, question, currentIndex, questions.length, correct, wrong, onComplete],
  );

  if (finished) {
    return (
      <StudyComplete
        total={questions.length}
        correct={correct}
        wrong={wrong}
        elapsedMs={Date.now() - startTime}
        onStudyAgain={() => {
          setCurrentIndex(0);
          setSelectedIndex(null);
          setCorrect(0);
          setWrong(0);
          setFinished(false);
        }}
      />
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <StudyProgress
        current={currentIndex}
        total={questions.length}
        correct={correct}
        wrong={wrong}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="text-center text-xl font-medium leading-relaxed text-gray-900 dark:text-white">
          {question.card.front}
        </p>
      </div>

      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          let className =
            "w-full rounded-xl border px-5 py-4 text-left text-base font-medium transition-all ";

          if (selectedIndex === null) {
            className +=
              "border-gray-200 bg-white text-gray-900 hover:border-focus-400 hover:bg-focus-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-focus-500 dark:hover:bg-focus-900/20";
          } else if (i === question.correctIndex) {
            className +=
              "border-green-400 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300";
          } else if (i === selectedIndex) {
            className +=
              "border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300";
          } else {
            className +=
              "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500";
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selectedIndex !== null}
              className={className}
            >
              <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {String.fromCharCode(65 + i)}
              </span>
              {choice}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        {t("study.quizHint")}
      </p>
    </div>
  );
}
