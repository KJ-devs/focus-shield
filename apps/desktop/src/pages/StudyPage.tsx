import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { reviewCard, generateQuiz } from "@focus-shield/knowledge";
import type { ReviewRating, Flashcard, QuizQuestion } from "@focus-shield/knowledge";
import {
  knowledgeGetDueFlashcards,
  knowledgeUpdateFlashcardReview,
  knowledgeCreateReviewSession,
} from "@/tauri/knowledge";
import type { FlashcardRecord } from "@/tauri/knowledge";
import { DeckSelector } from "@/components/knowledge/DeckSelector";
import { FlashcardView } from "@/components/knowledge/FlashcardView";
import { ReviewButtons } from "@/components/knowledge/ReviewButtons";
import { StudyProgress } from "@/components/knowledge/StudyProgress";
import { StudyComplete } from "@/components/knowledge/StudyComplete";
import { QuizView } from "@/components/knowledge/QuizView";
import { useGamificationStore } from "@/stores/gamification-store";

type StudyMode = "flashcard" | "quiz";

function recordToFlashcard(r: FlashcardRecord): Flashcard {
  return {
    id: r.id,
    documentId: r.documentId,
    folderId: r.folderId,
    front: r.front,
    back: r.back,
    type: r.cardType as Flashcard["type"],
    ease: r.ease,
    interval: r.interval,
    repetitions: r.repetitions,
    nextReviewAt: new Date(r.nextReviewAt),
    lastReviewedAt: r.lastReviewedAt ? new Date(r.lastReviewedAt) : null,
    createdAt: new Date(r.createdAt),
  };
}

function previewIntervals(
  card: FlashcardRecord,
): Record<ReviewRating, number> {
  const ratings: ReviewRating[] = ["again", "hard", "good", "easy"];
  const result = {} as Record<ReviewRating, number>;
  for (const rating of ratings) {
    const preview = reviewCard(
      { ease: card.ease, interval: card.interval, repetitions: card.repetitions },
      rating,
    );
    result[rating] = preview.interval;
  }
  return result;
}

export function StudyPage() {
  const { t } = useTranslation();
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [xpEarned, setXpEarned] = useState(0);

  const startTimeRef = useRef(Date.now());
  const resolvedFolderId = folderId === "all" ? undefined : folderId;

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const due = await knowledgeGetDueFlashcards(resolvedFolderId);
      setCards(due);
      if (mode === "quiz" && due.length >= 2) {
        const flashcards = due.map(recordToFlashcard);
        setQuizQuestions(generateQuiz(flashcards, Math.min(due.length, 20)));
      }
    } catch {
      // IPC unavailable
    } finally {
      setIsLoading(false);
    }
  }, [resolvedFolderId, mode]);

  useEffect(() => {
    if (folderId) {
      void loadCards();
    }
  }, [folderId, loadCards]);

  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setWrong(0);
    setFinished(false);
    setXpEarned(0);
    startTimeRef.current = Date.now();
    void loadCards();
  }, [loadCards]);

  const saveReviewSession = useCallback(
    async (reviewedCount: number, correctCount: number, wrongCount: number) => {
      try {
        await knowledgeCreateReviewSession({
          id: crypto.randomUUID(),
          folderId: resolvedFolderId ?? "all",
          startedAt: new Date(startTimeRef.current).toISOString(),
          endedAt: new Date().toISOString(),
          cardsReviewed: reviewedCount,
          correctCount,
          wrongCount,
        });
      } catch {
        // IPC unavailable
      }
    },
    [resolvedFolderId],
  );

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      const card = cards[currentIndex];
      if (!card) return;

      const isCorrectRating = rating === "good" || rating === "easy";
      const newCorrect = correct + (isCorrectRating ? 1 : 0);
      const newWrong = wrong + (isCorrectRating ? 0 : 1);

      if (isCorrectRating) {
        setCorrect(newCorrect);
      } else {
        setWrong(newWrong);
      }

      const result = reviewCard(
        { ease: card.ease, interval: card.interval, repetitions: card.repetitions },
        rating,
      );

      try {
        await knowledgeUpdateFlashcardReview({
          id: card.id,
          ease: result.ease,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewAt: result.nextReviewAt.toISOString(),
        });
      } catch {
        // IPC unavailable
      }

      if (currentIndex + 1 >= cards.length) {
        setFinished(true);
        const earnedXp = newCorrect * 5 + newWrong * 2;
        setXpEarned(earnedXp);
        await saveReviewSession(cards.length, newCorrect, newWrong);
        await useGamificationStore.getState().recordReviewXP(newCorrect, newWrong);
      } else {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
      }
    },
    [cards, currentIndex, correct, wrong, saveReviewSession],
  );

  const handleQuizComplete = useCallback(
    (quizCorrect: number, quizWrong: number) => {
      const earnedXp = quizCorrect * 5 + quizWrong * 2;
      setXpEarned(earnedXp);
      void saveReviewSession(
        quizCorrect + quizWrong,
        quizCorrect,
        quizWrong,
      );
      void useGamificationStore.getState().recordReviewXP(quizCorrect, quizWrong);
    },
    [saveReviewSession],
  );

  // No folderId = show deck selector
  if (!folderId) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          {t("study.title")}
        </h1>
        <DeckSelector />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("study.noCards")}
        </h2>
        <button
          onClick={() => navigate("/study")}
          className="text-focus-600 hover:underline dark:text-focus-400"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("study.title")}
        </h1>
        <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { setMode("flashcard"); resetSession(); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "flashcard"
                ? "bg-focus-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {t("study.flashcardMode")}
          </button>
          <button
            onClick={() => { setMode("quiz"); resetSession(); }}
            disabled={cards.length < 2}
            className={`px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === "quiz"
                ? "bg-focus-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {t("study.quizMode")}
          </button>
        </div>
      </div>

      {/* Quiz mode */}
      {mode === "quiz" && quizQuestions.length > 0 && (
        <QuizView
          questions={quizQuestions}
          startTime={startTimeRef.current}
          onComplete={handleQuizComplete}
        />
      )}

      {/* Flashcard mode */}
      {mode === "flashcard" && !finished && currentCard && (
        <div className="flex flex-col gap-6">
          <StudyProgress
            current={currentIndex}
            total={cards.length}
            correct={correct}
            wrong={wrong}
          />

          <FlashcardView
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((f) => !f)}
          />

          {isFlipped && (
            <ReviewButtons
              onRate={handleRate}
              intervals={previewIntervals(currentCard)}
            />
          )}
        </div>
      )}

      {/* Flashcard complete */}
      {mode === "flashcard" && finished && (
        <StudyComplete
          total={cards.length}
          correct={correct}
          wrong={wrong}
          elapsedMs={Date.now() - startTimeRef.current}
          xpEarned={xpEarned}
          onStudyAgain={resetSession}
        />
      )}
    </div>
  );
}
