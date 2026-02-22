import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MasterKeySetupProps {
  configured: boolean;
  onConfigured: (configured: boolean) => void;
}

// ---------------------------------------------------------------------------
// Mock master key generation (browser UI only, no real crypto)
// ---------------------------------------------------------------------------

function generateMockMasterKey(): string {
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    segments.push(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
  }
  return segments.join("-");
}

// ---------------------------------------------------------------------------
// Unconfigured view
// ---------------------------------------------------------------------------

function SetupForm({ onConfigured }: { onConfigured: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const key = generateMockMasterKey();
    setGeneratedKey(key);
  };

  const handleConfirmSaved = () => {
    setGeneratedKey(null);
    setPassword("");
    setConfirmPassword("");
    onConfigured();
  };

  if (generatedKey) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <p className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            Save this master key now. It will not be shown again.
          </p>
          <code className="block break-all rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            {generatedKey}
          </code>
        </div>
        <Button onClick={handleConfirmSaved}>
          I have saved my master key
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        The master key is an emergency override that can unlock any session. Set
        a password to protect it. The encrypted master key is stored locally.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-20 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-2 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-2 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={password.length === 0 || confirmPassword.length === 0}
      >
        Generate Master Key
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configured view
// ---------------------------------------------------------------------------

function ConfiguredView({ onReset }: { onReset: () => void }) {
  const [resetting, setResetting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    if (currentPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    // Mock validation: accept any password >= 8 chars
    setError(null);
    setCurrentPassword("");
    setResetting(false);
    onReset();
  };

  if (resetting) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter your current password to reset the master key.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-2 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="danger" onClick={handleReset}>
            Confirm Reset
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setResetting(false);
              setCurrentPassword("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="success">Configured</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Master key is set up and encrypted locally.
        </span>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setResetting(true)}>
        Reset Master Key
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MasterKeySetup({
  configured,
  onConfigured,
}: MasterKeySetupProps) {
  if (configured) {
    return (
      <ConfiguredView onReset={() => onConfigured(false)} />
    );
  }

  return <SetupForm onConfigured={() => onConfigured(true)} />;
}
