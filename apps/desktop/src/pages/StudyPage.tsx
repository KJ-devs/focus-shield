import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { reviewCard, generateQuiz } from "@focus-shield/knowledge";
import type { ReviewRating, Flashcard, QuizQuestion } from "@focus-shield/knowledge";
import {
  knowledgeGetDueFlashcards,
  knowledgeUpdateFlashcardReview,
  knowledgeCreateReviewSession,
  knowledgeDeleteFlashcard,
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
  const [streak, setStreak] = useState(0);

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
    setStreak(0);
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

  const advanceCard = useCallback(() => {
    if (currentIndex + 1 >= cards.length) {
      setFinished(true);
      const earnedXp = correct * 5 + wrong * 2;
      setXpEarned(earnedXp);
      void saveReviewSession(cards.length, correct, wrong);
      void useGamificationStore.getState().recordReviewXP(correct, wrong);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }, [cards.length, currentIndex, correct, wrong, saveReviewSession]);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      const card = cards[currentIndex];
      if (!card) return;

      const isCorrectRating = rating === "good" || rating === "easy";

      if (isCorrectRating) {
        setCorrect((c) => c + 1);
        setStreak((s) => s + 1);
      } else {
        setWrong((w) => w + 1);
        setStreak(0);
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

      advanceCard();
    },
    [cards, currentIndex, advanceCard],
  );

  const handleSkipCard = useCallback(() => {
    advanceCard();
  }, [advanceCard]);

  const handleDeleteCard = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card) return;

    try {
      await knowledgeDeleteFlashcard(card.id);
      const newCards = cards.filter((_, i) => i !== currentIndex);
      setCards(newCards);

      if (newCards.length === 0) {
        setFinished(true);
        const earnedXp = correct * 5 + wrong * 2;
        setXpEarned(earnedXp);
      } else if (currentIndex >= newCards.length) {
        setCurrentIndex(newCards.length - 1);
      }
      setIsFlipped(false);
    } catch {
      // IPC unavailable
    }
  }, [cards, currentIndex, correct, wrong]);

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

  if (cards.length === 0 && !finished) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/study")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("study.title")}
          </h1>
        </div>
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

          {/* Streak indicator */}
          {streak >= 2 && (
            <div className="text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {streak} streak!
              </span>
            </div>
          )}

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

          {/* Card actions — skip & delete */}
          <div className="mx-auto flex items-center gap-4">
            <button
              onClick={handleSkipCard}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M3.288 4.819A1.5 1.5 0 001 6.095v7.81a1.5 1.5 0 002.288 1.277l5.212-3.906v3.906a1.5 1.5 0 002.288 1.277l5.212-3.906a1.5 1.5 0 000-2.553L10.788 4.82A1.5 1.5 0 008.5 6.094v3.906L3.288 4.82z"/></svg>
              Skip
            </button>
            <button
              onClick={() => void handleDeleteCard()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd"/></svg>
              Delete card
            </button>
          </div>
        </div>
      )}

      {/* Flashcard complete */}
      {mode === "flashcard" && finished && (
        <StudyComplete
          total={correct + wrong}
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
