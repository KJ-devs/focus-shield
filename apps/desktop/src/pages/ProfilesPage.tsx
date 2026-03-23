import { useState } from "react";
import { useProfileStore } from "@/stores/profile-store";
import type { ProfileData } from "@/stores/profile-store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getProfileEmoji, PROFILE_ICONS } from "@/data/profile-icons";
import type { LockLevel } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Lock level labels
// ---------------------------------------------------------------------------

const LOCK_LEVEL_LABELS: Record<LockLevel, string> = {
  1: "Gentle",
  2: "Moderate",
  3: "Strict",
  4: "Hardcore",
  5: "Nuclear",
};

const LOCK_LEVELS: LockLevel[] = [1, 2, 3, 4, 5];

// ---------------------------------------------------------------------------
// Profile form
// ---------------------------------------------------------------------------

interface ProfileFormData {
  name: string;
  icon: string;
  defaultLockLevel: LockLevel;
  dailyFocusGoal: number;
}

function ProfileForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialData: ProfileFormData;
  onSubmit: (data: ProfileFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialData.name);
  const [icon, setIcon] = useState(initialData.icon);
  const [lockLevel, setLockLevel] = useState<LockLevel>(initialData.defaultLockLevel);
  const [dailyGoal, setDailyGoal] = useState(initialData.dailyFocusGoal.toString());

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const goalMinutes = parseInt(dailyGoal, 10);
    onSubmit({
      name: trimmedName,
      icon,
      defaultLockLevel: lockLevel,
      dailyFocusGoal: Number.isNaN(goalMinutes) || goalMinutes < 0 ? 240 : goalMinutes,
    });
  };

  return (
    <Card>
      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Profile Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work, Study, Personal"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {/* Icon picker */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {PROFILE_ICONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIcon(opt.id)}
                title={opt.label}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition-colors ${
                  icon === opt.id
                    ? "border-focus-500 bg-focus-50 dark:border-focus-400 dark:bg-focus-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
                }`}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Lock level */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default Lock Level
          </label>
          <div className="flex gap-2">
            {LOCK_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setLockLevel(level)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-colors ${
                  lockLevel === level
                    ? "border-focus-500 bg-focus-50 text-focus-700 dark:border-focus-400 dark:bg-focus-900/20 dark:text-focus-400"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <div className="font-bold">{level}</div>
                <div className="text-xs">{LOCK_LEVEL_LABELS[level]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Daily focus goal */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Daily Focus Goal (minutes)
          </label>
          <input
            type="number"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(e.target.value)}
            min={0}
            max={1440}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {parseInt(dailyGoal, 10) >= 60
              ? `${Math.floor(parseInt(dailyGoal, 10) / 60)}h ${parseInt(dailyGoal, 10) % 60}m per day`
              : `${dailyGoal || 0}m per day`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!name.trim()}>
            {submitLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

function ProfileCard({
  profile,
  isActive,
  isOnly,
  onEdit,
  onDelete,
  onSetActive,
}: {
  profile: ProfileData;
  isActive: boolean;
  isOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
}) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl dark:bg-gray-700">
          {getProfileEmoji(profile.icon)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {profile.name}
            </h3>
            {isActive && <Badge variant="success">Active</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>
              Lock: <span className="font-medium">{LOCK_LEVEL_LABELS[profile.defaultLockLevel]}</span>
            </span>
            <span>
              Goal:{" "}
              <span className="font-medium">
                {profile.dailyFocusGoal >= 60
                  ? `${Math.floor(profile.dailyFocusGoal / 60)}h ${profile.dailyFocusGoal % 60}m`
                  : `${profile.dailyFocusGoal}m`}
                /day
              </span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-2">
          {!isActive && (
            <Button variant="secondary" size="sm" onClick={onSetActive}>
              Set Active
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isOnly}
            className={isOnly ? "opacity-30" : "text-red-600 hover:text-red-700 dark:text-red-400"}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type FormMode =
  | { type: "closed" }
  | { type: "add" }
  | { type: "edit"; profileId: string };

export function ProfilesPage() {
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const addProfile = useProfileStore((s) => s.addProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);

  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });

  const editingProfile =
    formMode.type === "edit"
      ? profiles.find((p) => p.id === formMode.profileId)
      : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          Profiles
        </h1>
        {formMode.type === "closed" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setFormMode({ type: "add" })}
          >
            + Add Profile
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Profile list */}
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isActive={profile.id === activeProfileId}
            isOnly={profiles.length <= 1}
            onEdit={() => setFormMode({ type: "edit", profileId: profile.id })}
            onDelete={() => deleteProfile(profile.id)}
            onSetActive={() => setActiveProfile(profile.id)}
          />
        ))}

        {/* Add form */}
        {formMode.type === "add" && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              New Profile
            </h2>
            <ProfileForm
              initialData={{
                name: "",
                icon: "briefcase",
                defaultLockLevel: 2,
                dailyFocusGoal: 240,
              }}
              onSubmit={(data) => {
                addProfile(data);
                setFormMode({ type: "closed" });
              }}
              onCancel={() => setFormMode({ type: "closed" })}
              submitLabel="Create Profile"
            />
          </div>
        )}

        {/* Edit form */}
        {formMode.type === "edit" && editingProfile && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Edit Profile
            </h2>
            <ProfileForm
              initialData={{
                name: editingProfile.name,
                icon: editingProfile.icon,
                defaultLockLevel: editingProfile.defaultLockLevel,
                dailyFocusGoal: editingProfile.dailyFocusGoal,
              }}
              onSubmit={(data) => {
                updateProfile(editingProfile.id, data);
                setFormMode({ type: "closed" });
              }}
              onCancel={() => setFormMode({ type: "closed" })}
              submitLabel="Save Changes"
            />
          </div>
        )}
      </div>
    </div>
  );
}
