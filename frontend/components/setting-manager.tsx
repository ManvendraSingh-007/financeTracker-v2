"use client"

import * as React from "react"
import {
  CheckIcon,
  CoinsIcon,
  KeyRoundIcon,
  LogOutIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDashboardUser } from "@/components/dashboard-user-provider"


// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system"
type NotificationFrequency = "daily" | "weekly" | "monthly" | "never"

type ProfileForm = {
  username: string
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
}

type PreferencesForm = {
  currency: string
  theme: Theme
  budgetAlerts: boolean
  goalAlerts: boolean
  notificationFrequency: NotificationFrequency
}

// ─── Constants ────────────────────────────────────────────────────────────────

const currencies = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
]

const notificationFrequencyOptions: { value: NotificationFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "never", label: "Never" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 border-b last:border-b-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="sm:w-56 shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${checked ? "bg-primary" : "bg-input"
        }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </CardHeader>
  )
}

function SaveButton({
  isSaving,
  saved,
  onClick,
}: {
  isSaving: boolean
  saved: boolean
  onClick: () => void
}) {
  return (
    <Button type="button" onClick={onClick} disabled={isSaving} className="gap-2 cursor-pointer">
      {saved ? (
        <>
          <CheckIcon className="size-4" />
          Saved
        </>
      ) : isSaving ? (
        "Saving..."
      ) : (
        "Save Changes"
      )}
    </Button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsManager() {
  const { user, isLoadingUser, refreshUser } = useDashboardUser()
  // Profile
  const [profile, setProfile] = React.useState<ProfileForm>({
    username: "John Doe",
  })
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)
  const [profileSaved, setProfileSaved] = React.useState(false)

  // Password
  const [passwordForm, setPasswordForm] = React.useState<PasswordForm>({
    currentPassword: "",
    newPassword: ""
  })
  const [isSavingPassword, setIsSavingPassword] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState("")
  const [passwordSaved, setPasswordSaved] = React.useState(false)

  // Preferences
  const [preferences, setPreferences] = React.useState<PreferencesForm>({
    currency: "INR",
    theme: "system",
    budgetAlerts: true,
    goalAlerts: true,
    notificationFrequency: "weekly",
  })
  const [isSavingPrefs, setIsSavingPrefs] = React.useState(false)
  const [prefsSaved, setPrefsSaved] = React.useState(false)

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")

  React.useEffect(() => {
    if (!user) {
      return
    }

    setProfile((prev) => ({
      ...prev,
      username: user.username || prev.username,
    }))

    setPreferences((prev) => ({
      ...prev,
      currency: user.currency_preference || prev.currency,
    }))
  }, [user])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    setIsSavingProfile(true)
    setProfileSaved(false)
    await apiFetch("/settings/profile", { method: "PUT", body: JSON.stringify(profile) })
    await new Promise((r) => setTimeout(r, 800))
    setIsSavingProfile(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  async function handleSavePassword() {
    // 1. Reset states
    setPasswordError("");
    setPasswordSaved(false);

    // 2. Local Validations
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("All password fields are required");
      return;
    }


    try {
      setIsSavingPassword(true);
      const response = await apiFetch("/settings/password", {
        method: "PUT",
        body: JSON.stringify(passwordForm),
        redirectOnUnauthorized: false
      });

      if (!response.ok) {
        const data = await response.json();
        setPasswordError(data.error || "Failed To Update");
        setIsSavingPassword(false);
        return;
      } else {
        setIsSavingPassword(false);
      }

      setPasswordSaved(true);
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } finally {
      setTimeout(() => setPasswordSaved(false), 2500);
    }
  }


  async function handleSavePreferences() {
    setIsSavingPrefs(true);
    setPrefsSaved(false);

    try {
      const response = await apiFetch("/settings/preferences", {
        method: "PUT",
        body: JSON.stringify(preferences),
        redirectOnUnauthorized: false
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error - you might want to add a preferencesError state
        console.error(data.error);
        return;
      }

      await refreshUser()
      window.dispatchEvent(new Event("currency-preference-updated"))
      setPrefsSaved(true);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setIsSavingPrefs(false);
      setTimeout(() => setPrefsSaved(false), 2500);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;

    try {
      const response = await apiFetch("/settings/account", {
        method: "DELETE",
        // No redirectOnUnauthorized needed here - we want redirect on 401
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete account");
        return;
      }

      // The backend Logout will clear the cookie and return a response
      // The apiFetch will handle the 401 redirect to login
      // So we don't need to do anything here
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Failed to delete account. Please try again.");
    }
  }

  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        redirectOnUnauthorized: false,
      })
    } finally {
      window.location.href = '/auth/login'
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and notifications.
        </p>
        {isLoadingUser ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Loading current preferences...
          </p>
        ) : null}
      </div>

      {/* ── Profile ── */}
      <div className="px-4 lg:px-6">
        <Card>
          <SectionHeader
            icon={UserIcon}
            title="Profile"
            description="Update your display name and email address."
          />
          <CardContent className="pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-username">Username</Label>
                <Input
                  id="settings-username"
                  value={profile.username}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <SaveButton
                isSaving={isSavingProfile}
                saved={profileSaved}
                onClick={handleSaveProfile}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Password ── */}
      <div className="px-4 lg:px-6">
        <Card>
          <SectionHeader
            icon={KeyRoundIcon}
            title="Password"
            description="Change your login password. Use at least 8 characters."
          />
          <CardContent className="pt-2">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-current-password">Current Password</Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-new-password">New Password</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>
            {passwordError ? (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {passwordError}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end">
              <SaveButton
                isSaving={isSavingPassword}
                saved={passwordSaved}
                onClick={handleSavePassword}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Preferences ── */}
      <div className="px-4 lg:px-6">
        <Card>
          <SectionHeader
            icon={CoinsIcon}
            title="Preferences"
            description="Customize currency, appearance, and notification settings."
          />
          <CardContent className="pt-2">
            <SettingRow
              label="Currency"
              description="Used for displaying all amounts across the app."
            >
              <Select
                value={preferences.currency}
                onValueChange={(value) =>
                  value && setPreferences((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              label="Theme"
              description="Choose how the app looks for you."
            >
              <div className="flex gap-2">
                {(["light", "dark", "system"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setPreferences((prev) => ({ ...prev, theme: t }))
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${preferences.theme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    {t === "light" ? (
                      <SunIcon className="size-3" />
                    ) : t === "dark" ? (
                      <MoonIcon className="size-3" />
                    ) : null}
                    {t}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              label="Budget Alerts"
              description="Get notified when you're close to or over a budget limit."
            >
              <div className="flex justify-end sm:justify-start">
                <Toggle
                  checked={preferences.budgetAlerts}
                  onChange={(value) =>
                    setPreferences((prev) => ({ ...prev, budgetAlerts: value }))
                  }
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Savings Goal Alerts"
              description="Receive reminders to contribute toward your savings goals."
            >
              <div className="flex justify-end sm:justify-start">
                <Toggle
                  checked={preferences.goalAlerts}
                  onChange={(value) =>
                    setPreferences((prev) => ({ ...prev, goalAlerts: value }))
                  }
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Notification Frequency"
              description="How often you'd like to receive summary reports."
            >
              <Select
                value={preferences.notificationFrequency}
                onValueChange={(value) =>
                  value &&
                  setPreferences((prev) => ({
                    ...prev,
                    notificationFrequency: value as NotificationFrequency,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {notificationFrequencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </SettingRow>

            <div className="mt-4 flex justify-end">
              <SaveButton
                isSaving={isSavingPrefs}
                saved={prefsSaved}
                onClick={handleSavePreferences}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Session ── */}
      <div className="px-4 lg:px-6">
        <Card>
          <SectionHeader
            icon={ShieldIcon}
            title="Session"
            description="Manage your active login session."
          />
          <CardContent className="pt-2">
            <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Sign out of your account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  You will be redirected to the login page.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 gap-2 sm:mt-0 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOutIcon className="size-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Danger Zone ── */}
      <div className="px-4 lg:px-6">
        <Card className="border-rose-500/30">
          <SectionHeader
            icon={Trash2Icon}
            title="Danger Zone"
            description="Irreversible actions. Please proceed with caution."
          />
          <CardContent className="pt-2">
            <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Delete Account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permanently deletes your account, transactions, budgets, and savings
                  goals. This cannot be undone.
                </p>
                {showDeleteConfirm ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder='Type "DELETE" to confirm'
                      className="max-w-xs border-rose-500/40 focus-visible:ring-rose-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={deleteConfirmText !== "DELETE"}
                        onClick={handleDeleteAccount}
                        className="shrink-0 cursor-pointer"
                      >
                        Confirm Delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText("")
                        }}
                        className="shrink-0"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 shrink-0 gap-2 cursor-pointer border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 sm:ml-6 sm:mt-0"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2Icon className="size-4" />
                  Delete Account
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
