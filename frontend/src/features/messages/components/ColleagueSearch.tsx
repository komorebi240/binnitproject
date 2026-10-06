"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Highlight } from "@/components/ui/Highlight";
import { matchesAllWords } from "@/lib/textMatch";
import type { UserProfile } from "@/features/auth/types";
import { useDepartmentMembers } from "@/features/organization/hooks/useOrganization";

const MAX_RESULTS = 6;

interface ColleagueSearchProps {
  currentUser: UserProfile;
  onPick: (userId: number, fullName: string) => void;
}

/** Finds people of the user's own department to start a chat with, without leaving Messages. */
export function ColleagueSearch({ currentUser, onPick }: ColleagueSearchProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { data: members } = useDepartmentMembers(currentUser.departmentId);

  if (currentUser.departmentId == null) return null;

  const colleagues = (members ?? [])
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
        <span className="sr-only">Tìm đồng nghiệp cùng phòng ban</span>
        <MagnifyingGlass size={14} aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={`Tìm người ở ${currentUser.departmentName ?? "phòng ban"}...`}
          className="w-full rounded border border-gray-200 bg-white py-1.5 pl-7 pr-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      {showList && (
        <ul className="flex flex-col gap-0.5 rounded border border-gray-100 bg-white p-1">
          {colleagues.length === 0 ? (
            <li className="px-2 py-2 text-center text-xs text-gray-400">Không có ai phù hợp</li>
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
                    <span className="block truncate font-medium text-gray-900">
                      <Highlight text={m.fullName} query={query} />
                    </span>
                    {m.title && <span className="block truncate text-xs text-gray-500">{m.title}</span>}
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
