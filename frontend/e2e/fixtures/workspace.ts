import type { Page } from "@playwright/test";
import { financeFixture } from "./finance";

/** Synthetic records only; unexpected requests are rejected by the base fixture. */
export async function workspaceFixture(
  page: Page,
  role: "ceo" | "accountant" | "employee" = "ceo",
) {
  const base = await financeFixture(page, role);
  base.seedPending();
  const stamp = "2026-10-31T03:00:00Z";
  const department = {
    id: 1,
    name: "Product & Design",
    description: "Thiết kế sản phẩm và trải nghiệm khách hàng.",
    companyId: 1,
    color: null,
    icon: null,
  };
  const task = {
    id: 31,
    title: "Chuẩn bị kế hoạch sản phẩm quý IV",
    description: "Thống nhất mục tiêu và phạm vi thực hiện.",
    assigneeType: "USER",
    assigneeUserId: 10,
    assigneeUserName: "Synthetic Viewer",
    assigneeDepartmentId: null,
    assigneeDepartmentName: null,
    assignedByUserId: 10,
    assignedByUserName: "Synthetic Viewer",
    status: "ACCEPTED",
    priority: "HIGH",
    dueDate: "2026-11-05",
    createdAt: stamp,
    decidedAt: stamp,
    completedAt: null,
    driveUrl: null,
    attachments: [],
    checklist: [{ id: 1, text: "Kiểm tra kế hoạch", done: false }],
    projectId: null,
    canManage: true,
    hidden: false,
  };
  const dataset = {
    id: 21,
    name: "Khách hàng từ sự kiện tháng 10",
    sourceType: "EVENT",
    description: "Danh sách liên hệ và nhu cầu tư vấn.",
    departmentId: 1,
    departmentName: department.name,
    rowCount: 24,
    canManage: true,
    createdAt: stamp,
  };
  const records: Record<string, unknown> = {
    "/companies/me": {
      id: 1,
      name: "Synthetic Studio",
      description: "Cùng xây dựng sản phẩm tốt hơn mỗi ngày.",
      contactEmail: "hello@example.test",
      logoUrl: null,
      bannerUrl: null,
    },
    "/departments": [
      department,
      {
        ...department,
        id: 2,
        name: "Vận hành",
        description: "Điều phối công việc và hỗ trợ đội ngũ.",
      },
    ],
    "/departments/1/members": [],
    "/departments/1/teams": [],
    "/users": [
      {
        id: 11,
        username: "synthetic.employee",
        fullName: "Nguyễn Minh An",
        authorityLevel: "EMPLOYEE",
        title: "Product Designer",
        departmentId: 1,
        teamId: null,
        active: true,
        phone: "0900000000",
        employeeCode: "NV001",
        startDate: "2026-10-01",
        avatarUrl: null,
        presenceStatus: "ONLINE",
      },
    ],
    "/tasks": [task],
    "/kpi/me/summary": {
      userId: 10,
      fullName: "Synthetic Viewer",
      periodYear: 2026,
      periodMonth: 10,
      totalAssigned: 3,
      completed: 1,
      completionRatePercent: 33.3,
      onTimeRatePercent: 100,
      kpiScore: 53,
      incentiveLabel: null,
    },
    "/projects": [
      {
        id: 4,
        name: "Nâng cấp trải nghiệm khách hàng",
        description: "Phối hợp thiết kế, vận hành và chăm sóc khách hàng.",
        ownerDepartmentId: 1,
        ownerDepartmentName: department.name,
        memberCount: 8,
        supportDepartmentCount: 2,
        member: true,
        invitationWaiting: false,
      },
    ],
    "/crm/datasets": [dataset],
    "/crm/datasets/21": { dataset, columns: [] },
    "/whiteboards": [
      {
        id: 9,
        title: "Sơ đồ hành trình khách hàng",
        access: "OWNER",
        ownerName: "Synthetic Viewer",
        updatedAt: stamp,
      },
    ],
    "/notes": [
      {
        id: 7,
        title: "Ý tưởng cho buổi họp tuần",
        content: "Tổng hợp phản hồi và ưu tiên những cải tiến thiết thực.",
        pinned: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: 8,
        title: "Danh sách việc cần nhớ",
        content: "Kiểm tra lịch và chuẩn bị tài liệu.",
        pinned: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    "/drive/status": { connected: false, googleEmail: null },
    "/drive/catalog": [
      {
        id: 1,
        googleFolderId: "synthetic-test-only",
        googleFolderName: "Tài liệu dự án",
        departmentId: 1,
        departmentName: department.name,
      },
    ],
    "/drive/access-requests": [],
    "/messages/conversations": [
      {
        otherUserId: 11,
        otherUserName: "Nguyễn Minh An",
        otherUserAvatarUrl: null,
        otherUserPresenceStatus: "ONLINE",
        lastMessageBody: "Mình đã cập nhật kế hoạch.",
        lastMessageRecalled: false,
        lastMessageAttachmentName: null,
        lastMessageAt: stamp,
        unreadCount: 0,
      },
    ],
    "/messages/with/11": [
      {
        id: 1,
        senderId: 11,
        recipientId: 10,
        body: "Mình đã cập nhật kế hoạch.",
        read: true,
        createdAt: stamp,
        recalled: false,
        forwarded: false,
        attachment: null,
      },
    ],
    "/calendar/me": [
      {
        id: 1,
        title: "Họp kế hoạch tuần",
        description: null,
        eventType: "MEETING",
        startAt: "2026-10-31T08:00:00Z",
        endAt: "2026-10-31T09:00:00Z",
        status: "CONFIRMED",
        createdByUserId: 10,
        createdByName: "Synthetic Viewer",
        createdBySelf: true,
      },
    ],
    "/meetings": [
      {
        id: 1,
        title: "Họp kế hoạch tuần",
        description: "Thống nhất mục tiêu và phân công.",
        startAt: "2026-10-31T08:00:00Z",
        endAt: "2026-10-31T09:00:00Z",
        organizerUserId: 10,
        organizerName: "Synthetic Viewer",
        cancelled: false,
        calendarEventId: 1,
        myStatus: "CONFIRMED",
        meetUrl: "https://meet.google.com/abc-defg-hij",
        participants: [{ userId: 11, fullName: "Nguyễn Minh An", status: "CONFIRMED" }],
      },
    ],
    "/attendance/status": {
      today: "2026-10-31",
      serverTime: stamp,
      timeZone: "Asia/Ho_Chi_Minh",
      onApprovedLeave: false,
    },
    "/attendance/me": [
      {
        id: 1,
        userId: 10,
        fullName: "Synthetic Viewer",
        workDate: "2026-10-30",
        checkedInAt: "2026-10-30T01:00:00Z",
        checkedOutAt: "2026-10-30T09:00:00Z",
        workedMinutes: 480,
      },
    ],
    "/leave/quota": {
      month: "2026-10",
      monthlyDayLimit: 2,
      approvedDays: 1,
      remainingDays: 1,
      timeZone: "Asia/Ho_Chi_Minh",
    },
    "/leave/me": [
      {
        id: 1,
        userId: 10,
        fullName: "Synthetic Viewer",
        startDate: "2026-10-29",
        endDate: "2026-10-29",
        reason: "Nghỉ phép đã được xác nhận.",
        status: "APPROVED",
        createdAt: stamp,
        calendarEventId: 2,
      },
    ],
  };
  records["/projects/4"] = {
    ...(records["/projects"] as object[])[0],
    canManage: true,
    canWork: true,
    departments: [
      {
        departmentId: 1,
        departmentName: department.name,
        role: "OWNER",
        status: "ACCEPTED",
        memberCount: 8,
        note: null,
      },
    ],
    members: [],
    folders: [],
    respondableDepartmentIds: [],
    memberManageableDepartmentIds: [1],
  };
  records["/crm/datasets/21/rows"] = {
    rows: [],
    page: 0,
    size: 50,
    totalElements: 0,
    totalPages: 0,
  };
  records["/finance/entries"] = [
    {
      id: 81,
      date: "2026-10-31",
      direction: "INCOME",
      amount: "20000000",
      category: "SALES",
      account: "BANK",
      counterparty: "Thu từ hợp đồng thiết kế",
      description: "Thanh toán giai đoạn bàn giao sản phẩm.",
      reference: "SYN-001",
      voided: false,
    },
  ];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    if (route.request().method() !== "GET" || !(path in records)) return route.fallback();
    await route.fulfill({
      json: {
        success: true,
        data: records[path],
        meta: {
          timestamp: stamp,
          ...(path === "/finance/entries"
            ? { pagination: { page: 0, size: 25, totalElements: 1, totalPages: 1 } }
            : {}),
        },
      },
    });
  });
  return { ...base, task };
}
