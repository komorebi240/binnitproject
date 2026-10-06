import { Briefcase, GearSix } from "@phosphor-icons/react";
import type { AuthorityLevel } from "@/features/auth/types";
import { matchesAllWords } from "@/lib/textMatch";
import { NAV_ITEMS, type NavItem } from "./Sidebar";

/** A smaller feature that lives inside a page (a button, a form, a setting). Opening it opens the parent page. */
export interface SubFeature {
  label: string;
  /** Extra words people may type for it (matched like the label, never shown). */
  keywords?: string;
  roles?: AuthorityLevel[];
}

export interface FeatureEntry extends NavItem {
  /** Extra words people may type for the page itself (never shown). */
  keywords?: string;
  children: SubFeature[];
}

const MANAGERS: AuthorityLevel[] = ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD"];

/** Sub-features by page. When a page gains a feature, add it here (and to the tour in tourSteps) so search stays complete. */
const CHILDREN_BY_HREF: Record<string, SubFeature[]> = {
  "/dashboard": [
    { label: "Khối lượng công việc trong tháng", keywords: "thong ke" },
    { label: "Tỷ lệ hoàn thành", keywords: "thong ke" },
    { label: "KPI tháng này", keywords: "diem" },
    { label: "Biểu đồ việc hoàn thành 7 ngày", keywords: "thong ke bieu do" },
    { label: "Bảng việc Cần làm / Đang làm / Hoàn thành", keywords: "kanban cot" },
    { label: "Xem công việc dạng cột", keywords: "board bang" },
  ],
  "/dashboard/departments": [
    { label: "Tạo phòng ban", keywords: "them moi", roles: ["EXECUTIVE"] },
    { label: "Đổi màu và biểu tượng phòng ban", keywords: "ca nhan hoa tuy chinh giao dien", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { label: "Danh bạ nhân sự phòng ban", keywords: "thanh vien" },
    { label: "Nhóm trong phòng ban", keywords: "team" },
    { label: "Nhắn tin riêng cho thành viên", keywords: "chat" },
    { label: "Gửi yêu cầu Drive", keywords: "xin quyen thu muc" },
  ],
  "/dashboard/users": [
    { label: "Thêm nhân sự", keywords: "tao tai khoan" },
    { label: "Mời nhân sự qua email", keywords: "loi moi invite" },
    { label: "Đổi phòng ban và chức vụ nhân sự", keywords: "chuyen dieu chuyen" },
    { label: "KPI của nhân sự", keywords: "diem danh gia" },
    { label: "Thêm lịch cho nhân sự", keywords: "su kien" },
    { label: "Đặt lại mật khẩu cho nhân sự", keywords: "quen mat khau reset" },
    { label: "Đổi email cho nhân sự", keywords: "otp" },
    { label: "Khoá hoặc mở khoá tài khoản", keywords: "vo hieu hoa" },
    { label: "Xoá nhân sự", keywords: "xoa" },
  ],
  "/dashboard/tasks": [
    { label: "Giao việc mới", keywords: "tao cong viec", roles: MANAGERS },
    { label: "Tự tạo việc cho mình", keywords: "ca nhan" },
    { label: "Checklist trong công việc", keywords: "danh sach tick" },
    { label: "Đính kèm tệp khi giao việc", keywords: "file tai lieu" },
    { label: "Nhận hoặc từ chối việc", keywords: "chap nhan" },
    { label: "Hoàn thành công việc", keywords: "xong" },
    { label: "Lọc theo mức ưu tiên và hạn chót", keywords: "deadline" },
  ],
  "/dashboard/projects": [
    { label: "Tạo dự án chung nhiều phòng ban", keywords: "project phoi hop", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { label: "Mời phòng ban hỗ trợ", keywords: "phoi hop cheo", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { label: "Nhận hoặc từ chối lời mời dự án", keywords: "chap nhan", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { label: "Thêm người của phòng vào dự án", keywords: "thanh vien", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { label: "Công việc của dự án", keywords: "giao viec" },
    { label: "Trao đổi nhóm dự án", keywords: "chat nhom" },
    { label: "Thư mục Drive chung của dự án", keywords: "chia se tep" },
    { label: "Danh bạ thành viên dự án", keywords: "lien he nhan tin" },
  ],
  "/dashboard/messages": [
    { label: "Nhắn tin riêng", keywords: "chat" },
    { label: "Tìm đồng nghiệp cùng phòng ban", keywords: "nguoi" },
    { label: "Gửi ảnh và tệp", keywords: "dinh kem hinh" },
    { label: "Thu hồi tin nhắn", keywords: "xoa" },
    { label: "Lưu trữ hội thoại", keywords: "archive" },
  ],
  "/dashboard/calendar": [
    { label: "Thêm sự kiện", keywords: "hop lich" },
    { label: "Công tác nhiều ngày (từ ngày đến ngày)", keywords: "di cong tac keo dai" },
    { label: "Sự kiện sắp tới", keywords: "lich sap toi" },
    { label: "Chấp nhận hoặc từ chối sự kiện", keywords: "xac nhan" },
  ],
  "/dashboard/notes": [
    { label: "Tạo note mới", keywords: "ghi chu" },
    { label: "Mở rộng note", keywords: "xem lon" },
    { label: "Ghim note ra màn hình", keywords: "pin" },
  ],
  "/dashboard/drive": [
    { label: "Kết nối Google Drive", keywords: "lien ket" },
    { label: "Yêu cầu quyền thư mục", keywords: "xin quyen" },
    { label: "Duyệt yêu cầu truy cập", keywords: "phe duyet", roles: MANAGERS },
  ],
};

const SETTINGS_ENTRY: FeatureEntry = {
  href: "/dashboard/settings",
  label: "Cài đặt",
  icon: GearSix,
  children: [
    { label: "Đổi mật khẩu", keywords: "bao mat" },
    { label: "Ảnh đại diện", keywords: "avatar hinh" },
    { label: "Email khôi phục", keywords: "quen mat khau" },
    { label: "Giao diện sáng tối và màu chủ đề", keywords: "theme dark light" },
  ],
};

const COMPANY_ENTRY: FeatureEntry = {
  href: "/dashboard/company",
  label: "Công ty",
  icon: Briefcase,
  keywords: "gioi thieu doanh nghiep",
  children: [
    { label: "Giới thiệu công ty", keywords: "mo ta" },
    { label: "Danh sách phòng ban của công ty", keywords: "co cau" },
    { label: "Sửa thông tin công ty", keywords: "ten email gioi thieu", roles: ["EXECUTIVE"] },
    { label: "Đổi logo công ty", keywords: "hinh anh", roles: ["EXECUTIVE"] },
    { label: "Đổi ảnh bìa công ty", keywords: "banner hinh anh", roles: ["EXECUTIVE"] },
  ],
};

export const FEATURES: FeatureEntry[] = [
  ...NAV_ITEMS.map((item) => ({ ...item, children: CHILDREN_BY_HREF[item.href] ?? [] })),
  COMPANY_ENTRY,
  SETTINGS_ENTRY,
];

export interface FeatureGroup {
  entry: FeatureEntry;
  /** True when the page itself matched (or no query was typed). */
  pageMatches: boolean;
  /** The sub-features that matched, shown under their page. */
  children: SubFeature[];
}

function canSee(roles: AuthorityLevel[] | undefined, level: AuthorityLevel): boolean {
  return !roles || roles.includes(level);
}

/**
 * Pages whose own name matches, plus pages that contain a matching sub-feature (listed first, with the
 * matching sub-features underneath). With no query every page is returned, collapsed.
 */
export function searchFeatures(query: string, level: AuthorityLevel, features: FeatureEntry[] = FEATURES): FeatureGroup[] {
  const trimmed = query.trim();
  const groups: FeatureGroup[] = [];
  for (const entry of features) {
    if (!canSee(entry.roles, level)) continue;
    if (!trimmed) {
      groups.push({ entry, pageMatches: true, children: [] });
      continue;
    }
    const pageMatches = matchesAllWords(`${entry.label} ${entry.keywords ?? ""}`, trimmed);
    const children = entry.children.filter(
      (child) => canSee(child.roles, level) && matchesAllWords(`${child.label} ${child.keywords ?? ""}`, trimmed),
    );
    if (pageMatches || children.length > 0) groups.push({ entry, pageMatches, children });
  }
  return groups;
}
