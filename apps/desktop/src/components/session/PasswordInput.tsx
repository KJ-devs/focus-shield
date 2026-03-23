import { useState, useEffect, useCallback, useRef, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import type { LockLevel } from "@focus-shield/shared-types";
import { Button } from "@/components/ui/Button";
import { TOKEN_CONFIG } from "@/stores/session-store";

interface PasswordInputProps {
  onSubmit: (value: string) => Promise<boolean> | boolean;
  onCancel: () => void;
  lockLevel: LockLevel;
}

const MAX_ATTEMPTS = 3;
const RATE_LIMIT_COOLDOWN_MS = 300_000; // 5 minutes

export function PasswordInput({ onSubmit, onCancel, lockLevel }: PasswordInputProps) {
  const config = TOKEN_CONFIG[lockLevel];
  const requiresDoubleEntry = lockLevel >= 4;

  const [value, setValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [entryCooldownRemaining, setEntryCooldownRemaining] = useState(
    config.cooldownBeforeEntry ? Math.ceil(config.cooldownMs / 1000) : 0,
  );

  // Entry cooldown timer (levels 3-4: must wait before input is enabled)
  useEffect(() => {
    if (entryCooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setEntryCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [entryCooldownRemaining]);

  // Rate limit cooldown timer
  useEffect(() => {
    if (cooldownEndTime === null) return;
    const interval = setInterval(() => {
      const remaining = cooldownEndTime - Date.now();
      if (remaining <= 0) {
        setCooldownEndTime(null);
        setCooldownRemaining(0);
        setAttempts(0);
        clearInterval(interval);
      } else {
        setCooldownRemaining(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndTime]);

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      if (!config.pasteAllowed) {
        e.preventDefault();
        e.stopPropagation();
        setError("Paste is disabled — you must type the token manually");
      }
    },
    [config.pasteAllowed],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLInputElement>) => {
      if (!config.pasteAllowed) {
        e.preventDefault();
        e.stopPropagation();
        setError("Drag & drop is disabled — you must type the token manually");
      }
    },
    [config.pasteAllowed],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      if (!config.pasteAllowed) {
        e.preventDefault();
        setError("Right-click is disabled for this lock level");
      }
    },
    [config.pasteAllowed],
  );

  // Block programmatic value injection via JS — monitor for suspicious jumps
  const lastLengthRef = useRef(0);
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // If more than 2 characters were added at once and paste is blocked,
      // this is likely an auto-fill or programmatic injection
      if (!config.pasteAllowed && newValue.length - lastLengthRef.current > 2) {
        setError("Auto-fill detected — you must type each character manually");
        return;
      }
      lastLengthRef.current = newValue.length;
      setValue(newValue);
    },
    [config.pasteAllowed],
  );

  const handleConfirmChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (!config.pasteAllowed && newValue.length - confirmValue.length > 2) {
        setError("Auto-fill detected — you must type each character manually");
        return;
      }
      setConfirmValue(newValue);
    },
    [config.pasteAllowed, confirmValue.length],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (cooldownEndTime !== null) {
        setError(`Rate limited. Wait ${cooldownRemaining} seconds.`);
        return;
      }

      if (requiresDoubleEntry && value !== confirmValue) {
        setError("Entries do not match. Type the token identically in both fields.");
        return;
      }

      const valid = await onSubmit(value);

      if (!valid) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const endTime = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          setCooldownEndTime(endTime);
          setCooldownRemaining(Math.ceil(RATE_LIMIT_COOLDOWN_MS / 1000));
          setError(`Too many attempts. Locked for 5 minutes.`);
        } else {
          setError(`Invalid token. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? "s" : ""} remaining.`);
        }
        setValue("");
        setConfirmValue("");
      }
    },
    [value, confirmValue, attempts, cooldownEndTime, cooldownRemaining, requiresDoubleEntry, onSubmit],
  );

  const isInputDisabled = entryCooldownRemaining > 0 || cooldownEndTime !== null;

  return (
    <div className="mx-auto w-full sm:max-w-md">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
          Enter Unlock Token
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Level {lockLevel}: {config.name}
        </p>

        {/* Entry cooldown (levels 3+) */}
        {entryCooldownRemaining > 0 && (
          <div className="mb-6 flex flex-col items-center gap-2 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Cooldown before entry
            </p>
            <p className="font-mono text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {entryCooldownRemaining}s
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">
              Take a moment to reconsider...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary token input */}
          <div>
            <label
              htmlFor="token-input"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Token {requiresDoubleEntry ? "(first entry)" : ""}
            </label>
            <div className="relative">
              <input
                id="token-input"
                data-testid="token-input"
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={handleInputChange}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={(e) => { if (!config.pasteAllowed) e.preventDefault(); }}
                onContextMenu={handleContextMenu}
                disabled={isInputDisabled}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-lg tracking-wider text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-2 focus:ring-focus-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="Type your token..."
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm input (level 4+) */}
          {requiresDoubleEntry && (
            <div>
              <label
                htmlFor="token-confirm"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Token (confirm)
              </label>
              <input
                id="token-confirm"
                type={showPassword ? "text" : "password"}
                value={confirmValue}
                onChange={handleConfirmChange}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={(e) => { if (!config.pasteAllowed) e.preventDefault(); }}
                onContextMenu={handleContextMenu}
                disabled={isInputDisabled}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-lg tracking-wider text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-2 focus:ring-focus-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="Re-type your token..."
              />
            </div>
          )}

          {/* Error display */}
          {error && (
            <p data-testid="token-error" className="text-center text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Rate limit info */}
          {cooldownEndTime !== null && (
            <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Locked for {cooldownRemaining} seconds
              </p>
            </div>
          )}


          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="flex-1"
              disabled={isInputDisabled || value.length === 0}
              data-testid="unlock-submit-btn"
            >
              Unlock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
