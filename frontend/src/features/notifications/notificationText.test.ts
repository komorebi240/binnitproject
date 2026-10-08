import { describe, expect, it } from "@jest/globals";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { EN } from "@/lib/i18n/en";
import { translate } from "@/lib/i18n/translate";
import { VI } from "@/lib/i18n/vi";
import { notificationText } from "./notificationText";
import type { Notification, NotificationType } from "./types";

const vi = (key: TranslationKey, params?: Record<string, string | number>) => translate("vi", VI, VI, key, params);
const en = (key: TranslationKey, params?: Record<string, string | number>) => translate("en", EN, VI, key, params);

function notification(type: NotificationType, params: Notification["params"], extra: Partial<Notification> = {}): Notification {
  return { id: 1, type, title: "stored title", body: "stored body", params, relatedEntityType: null, relatedEntityId: null, read: false, createdAt: "2026-10-06T00:00:00Z", ...extra };
}

describe("notificationText", () => {
  it("rebuilds the text of a task notification in the reader's language", () => {
    const n = notification("TASK_ASSIGNED", { actor: "an", title: "Báo cáo Q3" });
    expect(notificationText(n, vi)).toEqual({ title: "Bạn có việc mới", body: "an đã giao \"Báo cáo Q3\"" });
    expect(notificationText(n, en)).toEqual({ title: "You have a new task", body: "an assigned \"Báo cáo Q3\"" });
  });

  it("uses the same Vietnamese sentences the backend stores", () => {
    expect(notificationText(notification("TASK_ACCEPTED", { actor: "an", title: "A" }), vi)).toEqual({ title: "Cập nhật công việc", body: "an đã nhận việc \"A\"" });
    expect(notificationText(notification("TASK_DECLINED", { actor: "an", title: "A" }), vi).body).toBe("an đã từ chối việc \"A\"");
    expect(notificationText(notification("TASK_COMPLETED", { actor: "an", title: "A" }), vi).body).toBe("an đã hoàn thành việc \"A\"");
    expect(notificationText(notification("CALENDAR_EVENT_INVITE", { actor: "an", title: "Họp" }), vi)).toEqual({
      title: "Lịch mới cần bạn xác nhận",
      body: "an đã thêm \"Họp\" vào lịch của bạn",
    });
    expect(notificationText(notification("FOLDER_ACCESS_REQUESTED", { actor: "an", folder: "Hợp đồng" }), vi)).toEqual({
      title: "Yêu cầu truy cập folder mới",
      body: "an xin quyền vào \"Hợp đồng\"",
    });
    expect(notificationText(notification("PROJECT_INVITED", { actor: "an", project: "Orbit" }), vi).body).toBe("an mời phòng của bạn tham gia \"Orbit\"");
    expect(notificationText(notification("PROJECT_MEMBER_ADDED", { actor: "an", project: "Orbit" }), vi)).toEqual({
      title: "Bạn được thêm vào dự án",
      body: "an đã thêm bạn vào \"Orbit\"",
    });
  });

  it("words a project answer by whether it was accepted", () => {
    const accepted = notification("PROJECT_RESPONDED", { department: "Vận hành", project: "Orbit", accepted: "true" });
    const declined = notification("PROJECT_RESPONDED", { department: "Vận hành", project: "Orbit", accepted: "false" });
    expect(notificationText(accepted, vi).body).toBe("Vận hành đã nhận tham gia \"Orbit\"");
    expect(notificationText(declined, vi).body).toBe("Vận hành đã từ chối tham gia \"Orbit\"");
    expect(notificationText(accepted, en).body).toBe("Vận hành accepted joining \"Orbit\"");
    expect(notificationText(declined, en).body).toBe("Vận hành declined to join \"Orbit\"");
  });

  it("keeps the sender's own words as the body of a message notification", () => {
    const n = notification("MESSAGE_RECEIVED", { actor: "binmit4" }, { body: "see you at 3" });
    expect(notificationText(n, en)).toEqual({ title: "New message from binmit4", body: "see you at 3" });
    expect(notificationText(n, vi).title).toBe("Tin nhắn mới từ binmit4");
  });

  it("words a message that is only an attachment itself", () => {
    const n = notification("MESSAGE_RECEIVED", { actor: "an", attachmentOnly: "true" }, { body: "Đã gửi một tệp đính kèm" });
    expect(notificationText(n, vi).body).toBe("Đã gửi một tệp đính kèm");
    expect(notificationText(n, en).body).toBe("Sent an attachment");
  });

  it("falls back to the stored text for an older notification or when a value is missing", () => {
    expect(notificationText(notification("TASK_ASSIGNED", null), en)).toEqual({ title: "stored title", body: "stored body" });
    expect(notificationText(notification("TASK_ASSIGNED", { actor: "an" }), en)).toEqual({ title: "stored title", body: "stored body" });
  });

  it("falls back to the stored text for a type this version does not know", () => {
    const n = notification("SOMETHING_NEW" as NotificationType, { actor: "an" });
    expect(notificationText(n, en)).toEqual({ title: "stored title", body: "stored body" });
  });
});
