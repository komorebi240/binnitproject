"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useColleagues } from "@/features/messages/hooks/useColleagues";
import { useI18n } from "@/lib/i18n/useI18n";
import { ACCESS_KEYS } from "../accessLabels";
import { useRemoveWhiteboardMember, useSetWhiteboardMember } from "../hooks/useWhiteboards";
import type { WhiteboardDetail, WhiteboardRole } from "../types";
import { whiteboardErrorMessage } from "../whiteboardErrors";

const ROLES: WhiteboardRole[] = ["EDITOR", "VIEWER"];

/**
 * Who has the board. The owner adds colleagues (the same people they can message: their department, or the whole
 * company for an executive), changes what each may do and removes them; everyone else only sees the list.
 */
export function ShareWhiteboardDialog({
  board,
  currentUser,
  onClose,
}: {
  board: WhiteboardDetail;
  currentUser: UserProfile;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { colleagues } = useColleagues(currentUser);
  const setMember = useSetWhiteboardMember(board.id);
  const removeMember = useRemoveWhiteboardMember(board.id);
  const isOwner = board.access === "OWNER";

  const memberIds = new Set(board.members.map((member) => member.userId));
  const candidates = colleagues.filter((colleague) => !memberIds.has(colleague.userId));
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<WhiteboardRole>("EDITOR");

  const roleOptions = ROLES.map((value) => ({ value, label: t(ACCESS_KEYS[value]) }));

  async function share(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;
    try {
      await setMember.mutateAsync({ userId: Number(userId), role });
      setUserId("");
      showToast("success", t("whiteboards.share.shared"));
    } catch (err) {
      showToast("error", whiteboardErrorMessage(err, t("whiteboards.share.couldNotShare"), t));
    }
  }

  async function changeRole(memberId: number, nextRole: WhiteboardRole) {
    try {
      await setMember.mutateAsync({ userId: memberId, role: nextRole });
    } catch (err) {
      showToast("error", whiteboardErrorMessage(err, t("whiteboards.share.couldNotShare"), t));
    }
  }

  async function remove(memberId: number) {
    try {
      await removeMember.mutateAsync(memberId);
    } catch (err) {
      showToast("error", whiteboardErrorMessage(err, t("whiteboards.share.couldNotRemove"), t));
    }
  }

  return (
    <Modal title={isOwner ? t("whiteboards.share.title") : t("whiteboards.view.people")} onClose={onClose}>
      {isOwner && (
        <form onSubmit={share} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Select
              label={t("whiteboards.share.person")}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              options={[
                { value: "", label: candidates.length > 0 ? t("whiteboards.share.choosePerson") : t("whiteboards.share.noOneLeft") },
                ...candidates.map((colleague) => ({ value: String(colleague.userId), label: colleague.fullName })),
              ]}
            />
          </div>
          <div className="sm:w-36">
            <Select label={t("whiteboards.share.role")} value={role} onChange={(e) => setRole(e.target.value as WhiteboardRole)} options={roleOptions} />
          </div>
          <Button type="submit" loading={setMember.isPending} disabled={!userId}>
            {t("whiteboards.share.shareAction")}
          </Button>
        </form>
      )}

      <ul className="flex flex-col divide-y divide-line" aria-label={t("whiteboards.view.people")}>
        {board.members.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0 truncate text-sm text-fg">
              {member.fullName || t("whiteboards.share.unknownPerson")}
              {member.userId === currentUser.userId && <span className="text-fg-muted"> {t("whiteboards.share.you")}</span>}
            </span>
            {isOwner && member.role !== "OWNER" ? (
              <span className="flex items-center gap-1">
                <label className="sr-only" htmlFor={`role-${member.userId}`}>
                  {t("whiteboards.share.roleOf", { name: member.fullName ?? "" })}
                </label>
                <select
                  id={`role-${member.userId}`}
                  value={member.role}
                  onChange={(e) => changeRole(member.userId, e.target.value as WhiteboardRole)}
                  className="h-8 rounded border border-line bg-surface px-2 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(member.userId)}
                  aria-label={t("whiteboards.share.removePerson", { name: member.fullName ?? "" })}
                  title={t("whiteboards.share.removePerson", { name: member.fullName ?? "" })}
                  className="flex h-8 w-8 items-center justify-center rounded text-fg-faint transition-colors duration-150 hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X size={16} aria-hidden />
                </button>
              </span>
            ) : (
              <Badge tone={member.role === "OWNER" ? "info" : "neutral"}>{t(ACCESS_KEYS[member.role])}</Badge>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
