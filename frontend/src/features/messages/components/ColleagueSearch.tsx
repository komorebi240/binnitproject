"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Highlight } from "@/components/ui/Highlight";
import { matchesAllWords } from "@/lib/textMatch";
import type { UserProfile } from "@/features/auth/types";
import type { PresenceStatus } from "@/features/auth/types";
import { useDepartmentMembers, useUsers } from "@/features/organization/hooks/useOrganization";

import { useI18n } from "@/lib/i18n/useI18n";
const MAX_RESULTS = 6;

interface ColleagueSearchProps {
  currentUser: UserProfile;
  onPick: (userId: number, fullName: string) => void;
}

interface Person {
  userId: number;
  fullName: string;
  title: string | null;
  email: string | null;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
}

/**
 * Finds people to start a chat with, without leaving Messages: the user's own department, or - for an
 * executive, who belongs to no department - everyone in the company.
 */
export function ColleagueSearch({ currentUser, onPick }: ColleagueSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const companyWide = currentUser.departmentId == null && currentUser.authorityLevel === "EXECUTIVE";
  const { data: members } = useDepartmentMembers(currentUser.departmentId);
  const { data: users } = useUsers(companyWide);

  if (currentUser.departmentId == null && !companyWide) return null;

  const people: Person[] = companyWide
    ? (users ?? []).filter((u) => u.active).map((u) => ({ userId: u.id, fullName: u.fullName, title: u.title, email: null, avatarUrl: u.avatarUrl, presenceStatus: u.presenceStatus }))
    : (members ?? []);
  const colleagues = people
    .filter((m) => m.userId !== currentUser.userId)
    .filter((m) => matchesAllWords(`${m.fullName} ${m.email ?? ""}`, query))
    .slice(0, MAX_RESULTS);
  const showList = focused || query.trim() !== "";

  function pick(userId: number, fullName: string) {
    setQuery("");
    setFocused(false);
    onPick(userId, fullName);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="relative block">
        <span className="sr-only">{companyWide ? t("messages.colleagueSearch.findPeopleInTheCompany") : t("common.findColleaguesInYourDepartment")}</span>
        <MagnifyingGlass size={14} aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-fg-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={companyWide ? t("messages.colleagueSearch.findPeopleInTheCompany2") : t("messages.colleagueSearch.findPeopleInV", { v: currentUser.departmentName ?? t("messages.colleagueSearch.department") })}
          className="w-full rounded border border-line bg-surface py-1.5 pl-7 pr-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      {showList && (
        <ul className="flex flex-col gap-0.5 rounded border border-line/60 bg-surface p-1">
          {colleagues.length === 0 ? (
            <li className="px-2 py-2 text-center text-xs text-fg-faint">{t("messages.colleagueSearch.noOneMatches")}</li>
          ) : (
            colleagues.map((m) => (
              <li key={m.userId}>
                <button
                  type="button"
                  // mouse down fires before the input's blur closes the list
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(m.userId, m.fullName);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Avatar avatarUrl={m.avatarUrl} fullName={m.fullName} presenceStatus={m.presenceStatus} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">
                      <Highlight text={m.fullName} query={query} />
                    </span>
                    {m.title && <span className="block truncate text-xs text-fg-muted">{m.title}</span>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
