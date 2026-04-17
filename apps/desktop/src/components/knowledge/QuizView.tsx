import { useState, useCallback, useRef, useEffect } from "react";
import type { QuizQuestion } from "@focus-shield/knowledge";
import { StudyProgress } from "./StudyProgress";
import { StudyComplete } from "./StudyComplete";
import { MarkdownContent } from "./MarkdownContent";

interface QuizViewProps {
  questions: QuizQuestion[];
  startTime: number;
  onComplete: (correct: number, wrong: number) => void;
}

export function QuizView({ questions, startTime, onComplete }: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [fillAnswer, setFillAnswer] = useState("");
  const [fillChecked, setFillChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const fillInputRef = useRef<HTMLInputElement>(null);

  const question = questions[currentIndex];

  useEffect(() => {
    if (question?.questionType === "fillin" && fillInputRef.current) {
      fillInputRef.current.focus();
    }
  }, [currentIndex, question?.questionType]);

  const advance = useCallback(
    (isCorrect: boolean) => {
      const newCorrect = correct + (isCorrect ? 1 : 0);
      const newWrong = wrong + (isCorrect ? 0 : 1);
      const newStreak = isCorrect ? streak + 1 : 0;

      if (isCorrect) setCorrect(newCorrect);
      else setWrong(newWrong);

      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          setFinished(true);
          onComplete(newCorrect, newWrong);
        } else {
          setCurrentIndex((i) => i + 1);
          setSelectedIndex(null);
          setFillAnswer("");
          setFillChecked(false);
        }
      }, 1500);
    },
    [correct, wrong, streak, bestStreak, currentIndex, questions.length, onComplete],
  );

  const handleMCQSelect = useCallback(
    (choiceIndex: number) => {
      if (selectedIndex !== null || !question) return;
      setSelectedIndex(choiceIndex);
      advance(choiceIndex === question.correctIndex);
    },
    [selectedIndex, question, advance],
  );

  const handleFillSubmit = useCallback(() => {
    if (fillChecked || !question) return;
    setFillChecked(true);
    const correctAnswer = question.choices[0] ?? "";
    const isCorrect = fillAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    advance(isCorrect);
  }, [fillChecked, question, fillAnswer, advance]);

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
          setFillAnswer("");
          setFillChecked(false);
          setCorrect(0);
          setWrong(0);
          setStreak(0);
          setBestStreak(0);
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

      {/* Streak indicator */}
      {streak >= 2 && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            {streak} streak!
          </span>
        </div>
      )}

      {/* Question type badge */}
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          {question.questionType === "mcq" && "Multiple Choice"}
          {question.questionType === "truefalse" && "True or False"}
          {question.questionType === "fillin" && "Fill in the Blank"}
        </span>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <MarkdownContent content={question.questionText} className="text-center text-lg" />
      </div>

      {/* MCQ choices */}
      {question.questionType === "mcq" && (
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
                onClick={() => handleMCQSelect(i)}
                disabled={selectedIndex !== null}
                className={className}
              >
                <span className="mr-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {String.fromCharCode(65 + i)}
                </span>
                <MarkdownContent content={choice} className="[&>*]:m-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* True/False choices */}
      {question.questionType === "truefalse" && (
        <div className="flex gap-4">
          {question.choices.map((choice, i) => {
            const isTrue = choice === "True";
            let className =
              "flex-1 rounded-xl border py-5 text-center text-lg font-semibold transition-all ";

            if (selectedIndex === null) {
              className += isTrue
                ? "border-green-200 bg-white text-green-700 hover:bg-green-50 dark:border-green-800 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-green-900/20"
                : "border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20";
            } else if (i === question.correctIndex) {
              className +=
                "border-green-400 bg-green-50 text-green-800 ring-2 ring-green-400 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300";
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
                onClick={() => handleMCQSelect(i)}
                disabled={selectedIndex !== null}
                className={className}
              >
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {/* Fill in the blank */}
      {question.questionType === "fillin" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={fillInputRef}
              type="text"
              value={fillAnswer}
              onChange={(e) => setFillAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && fillAnswer.trim()) handleFillSubmit();
              }}
              disabled={fillChecked}
              placeholder="Type your answer..."
              className={`flex-1 rounded-xl border px-5 py-4 text-base font-medium transition-all focus:outline-none focus:ring-2 ${
                fillChecked
                  ? fillAnswer.trim().toLowerCase() === (question.choices[0] ?? "").trim().toLowerCase()
                    ? "border-green-400 bg-green-50 text-green-800 ring-green-400 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300"
                    : "border-red-400 bg-red-50 text-red-800 ring-red-400 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300"
                  : "border-gray-200 bg-white text-gray-900 ring-focus-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              }`}
            />
            {!fillChecked && (
              <button
                onClick={handleFillSubmit}
                disabled={!fillAnswer.trim()}
                className="rounded-xl bg-focus-600 px-6 py-4 font-medium text-white transition-colors hover:bg-focus-700 disabled:opacity-50"
              >
                Check
              </button>
            )}
          </div>
          {fillChecked && fillAnswer.trim().toLowerCase() !== (question.choices[0] ?? "").trim().toLowerCase() && (
            <div className="rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
              <p className="text-sm text-green-700 dark:text-green-400">
                Correct answer: <strong>{question.choices[0]}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
