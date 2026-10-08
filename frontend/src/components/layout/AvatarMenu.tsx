"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDown, Camera, GearSix, SignOut, Translate } from "@phosphor-icons/react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Avatar, PRESENCE_STATUS_KEYS } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useLogout, useUpdatePresence, useUploadAvatar } from "@/features/auth/hooks/useAuth";
import type { PresenceStatus, UserProfile } from "@/features/auth/types";
import { useTabs } from "./TabsContext";

import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_OPTIONS: { value: PresenceStatus; dotClassName: string }[] = [
  { value: "ONLINE", dotClassName: "bg-success" },
  { value: "LIMITED", dotClassName: "bg-warning" },
  { value: "DO_NOT_DISTURB", dotClassName: "bg-danger" },
];

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ITEM_CLASS_NAME =
  "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-fg-soft transition-colors duration-150 hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none disabled:opacity-50";

/**
 * The avatar in the header opens a small menu with the four things people reach for most: set their
 * availability, open Cài đặt, change their photo, sign out. That replaces both the old "avatar = go to
 * settings" shortcut and the separate gear icon, which duplicated each other.
 */
export function AvatarMenu({ currentUser }: { currentUser: UserProfile }) {
  const { t } = useI18n();
  const router = useRouter();
  const { navigateActiveTab } = useTabs();
  const { showToast } = useToast();
  const uploadAvatar = useUploadAvatar();
  const updatePresence = useUpdatePresence();
  const logout = useLogout();

  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setStatusOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      if (buttons.length === 0) return;
      event.preventDefault();
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? (current + 1) % buttons.length : (current - 1 + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleStatus(status: PresenceStatus) {
    updatePresence.mutate(status, {
      onSuccess: () => showToast("success", t("layout.avatarMenu.statusV", { v: t(PRESENCE_STATUS_KEYS[status]) })),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTChangeYourStatus")),
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      showToast("error", t("layout.avatarMenu.theProfilePhotoMustBeA"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast("error", t("layout.avatarMenu.theProfilePhotoCanBe2mb"));
      return;
    }
    try {
      await uploadAvatar.mutateAsync(file);
      showToast("success", t("common.profilePhotoUpdated"));
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTUploadTheProfilePhoto"));
    }
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        title={t("common.account")}
        aria-label={t("common.accountMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour="profile"
        onClick={() => (open ? close() : setOpen(true))}
        className="rounded-full transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Avatar avatarUrl={currentUser.avatarUrl} fullName={currentUser.fullName} presenceStatus={currentUser.presenceStatus} size="sm" />
      </button>

      {/* Kept mounted so the file dialog still works after the menu closes. */}
      <input ref={fileInputRef} type="file" accept={AVATAR_TYPES.join(",")} onChange={handleFileChange} className="hidden" aria-label={t("layout.avatarMenu.chooseAProfilePhoto")} />

      {open && (
        <>
          <button type="button" aria-label={t("common.closeMenu")} onClick={close} className="fixed inset-0 z-20 cursor-default" />
          <div
            ref={menuRef}
            role="menu"
            className="animate-pop-in absolute right-0 top-11 z-30 glass w-64 origin-top-right rounded-lg p-1.5"
          >
            <div className="flex items-center gap-2.5 border-b border-line/60 px-2.5 pb-2.5 pt-1.5">
              <Avatar avatarUrl={currentUser.avatarUrl} fullName={currentUser.fullName} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{currentUser.fullName}</p>
                <p className="truncate text-xs text-fg-muted">{currentUser.title ?? currentUser.companyName}</p>
              </div>
            </div>

            <div className="mt-1.5 flex flex-col gap-0.5">
              <button
                type="button"
                role="menuitem"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((v) => !v)}
                className={ITEM_CLASS_NAME}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_OPTIONS.find((s) => s.value === currentUser.presenceStatus)?.dotClassName ?? "bg-success"}`}
                  aria-hidden
                />
                <span className="flex-1">{t("common.status")}</span>
                <span className="max-w-[7.5rem] truncate text-xs text-fg-muted">{t(PRESENCE_STATUS_KEYS[currentUser.presenceStatus])}</span>
                <CaretDown size={12} aria-hidden className={`shrink-0 text-fg-faint transition-transform duration-200 ${statusOpen ? "rotate-180" : ""}`} />
              </button>

              {/* grid-rows 0fr -> 1fr animates the height without measuring it */}
              <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${statusOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-0.5 pb-1 pl-5" role="group" aria-label={t("layout.avatarMenu.chooseAStatus")}>
                    {STATUS_OPTIONS.map((option) => {
                      const selected = option.value === currentUser.presenceStatus;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selected}
                          tabIndex={statusOpen ? 0 : -1}
                          onClick={() => handleStatus(option.value)}
                          disabled={updatePresence.isPending}
                          className={`${ITEM_CLASS_NAME} ${selected ? "bg-surface-muted font-medium text-fg" : ""}`}
                        >
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dotClassName}`} aria-hidden />
                          <span className="flex-1 text-xs">{t(PRESENCE_STATUS_KEYS[option.value])}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* The header has the switch from the sm breakpoint up; on a phone it lives here. */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm text-fg-soft sm:hidden">
                <span className="flex items-center gap-2">
                  <Translate size={16} aria-hidden className="shrink-0 text-fg-muted" />
                  {t("layout.avatarMenu.language")}
                </span>
                <LanguageSwitcher />
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  navigateActiveTab("/dashboard/settings");
                }}
                className={ITEM_CLASS_NAME}
              >
                <GearSix size={16} aria-hidden className="shrink-0 text-fg-muted" />
                {t("common.settings")}
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={uploadAvatar.isPending}
                onClick={() => {
                  close();
                  fileInputRef.current?.click();
                }}
                className={ITEM_CLASS_NAME}
              >
                <Camera size={16} aria-hidden className="shrink-0 text-fg-muted" />
                {uploadAvatar.isPending ? t("layout.avatarMenu.uploadingPhoto") : t("common.changeProfilePhoto")}
              </button>

              <button type="button" role="menuitem" disabled={logout.isPending} onClick={handleLogout} className={ITEM_CLASS_NAME.replace("text-fg-soft", "text-danger")}>
                <SignOut size={16} aria-hidden className="shrink-0" />
                {t("common.signOut")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
