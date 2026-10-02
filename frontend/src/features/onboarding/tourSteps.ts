import type { AuthorityLevel } from "@/features/auth/types";

export interface TourStep {
  id: string;
  /** Value of the `data-tour` attribute to spotlight; omitted = centered card. */
  target?: string;
  title: string;
  body: string;
}

const nav = (href: string) => `nav:${href}`;

const WELCOME_ADMIN: TourStep = {
  id: "welcome",
  title: "Chào mừng đến Orbit!",
  body: "Vài bước nhanh để bạn làm quen và thiết lập doanh nghiệp. Bạn có thể bỏ qua bất cứ lúc nào và xem lại trong Cài đặt.",
};

const WELCOME_STAFF: TourStep = {
  id: "welcome",
  title: "Chào mừng đến Orbit!",
  body: "Một vòng làm quen ngắn với những nơi bạn sẽ dùng hằng ngày. Bạn có thể bỏ qua và xem lại trong Cài đặt.",
};

const TASKS: TourStep = {
  id: "tasks",
  target: nav("/dashboard/tasks"),
  title: "Công việc",
  body: "Nhận, hoàn thành và theo dõi việc của bạn. Bấm vào một việc để xem chi tiết, tài liệu đính kèm và link Google Drive; dấu + để tự thêm việc cho mình.",
};

const MESSAGES: TourStep = {
  id: "messages",
  target: nav("/dashboard/messages"),
  title: "Tin nhắn",
  body: "Chat 1-1 với đồng nghiệp: gửi ảnh và tệp, thu hồi tin đã gửi, lưu trữ hội thoại không cần đến.",
};

const CALENDAR: TourStep = {
  id: "calendar",
  target: nav("/dashboard/calendar"),
  title: "Lịch của tôi",
  body: "Xem lịch tháng, thêm sự kiện bằng dấu +, xác nhận hoặc từ chối sự kiện người khác thêm cho bạn.",
};

const SEARCH: TourStep = {
  id: "search",
  target: "search",
  title: "Tìm kiếm nhanh",
  body: "Bấm hoặc nhấn Ctrl+K để nhảy tới bất kỳ trang nào. Thanh tab phía trên cho phép mở nhiều trang cùng lúc, như trình duyệt.",
};

const PROFILE: TourStep = {
  id: "profile",
  target: "profile",
  title: "Menu tài khoản",
  body: "Bấm ảnh đại diện để đổi nhanh trạng thái (trực tuyến / hạn chế / không làm phiền), mở Cài đặt (giao diện, mật khẩu, email khôi phục), đổi ảnh đại diện hoặc đăng xuất.",
};

const ADMIN_STEPS: TourStep[] = [
  WELCOME_ADMIN,
  {
    id: "company",
    target: "profile",
    title: "Thiết lập doanh nghiệp",
    body: "Bấm ảnh đại diện > Cài đặt để tải logo, đổi tên và email doanh nghiệp, chọn giao diện. Cũng ở menu này: đổi trạng thái, đổi ảnh đại diện, đăng xuất.",
  },
  {
    id: "departments",
    target: nav("/dashboard/departments"),
    title: "Phòng ban & nhóm",
    body: "Tạo cơ cấu tổ chức trước: bấm 'Tạo phòng ban', rồi thêm nhóm trong từng phòng ban.",
  },
  {
    id: "users",
    target: nav("/dashboard/users"),
    title: "Mời nhân sự",
    body: "Trong Nhân sự, bấm 'Mời qua email': người nhận mở liên kết và tự đặt tên đăng nhập, mật khẩu. Dấu + để tự tạo tài khoản.",
  },
  TASKS,
  MESSAGES,
  {
    id: "drive",
    target: nav("/dashboard/drive"),
    title: "Google Drive",
    body: "Kết nối Drive và quản lý quyền truy cập thư mục theo phòng ban.",
  },
  SEARCH,
  {
    id: "done",
    title: "Sẵn sàng!",
    body: "Việc nên làm đầu tiên: tạo phòng ban, rồi mời nhân sự vào đúng phòng ban. Xem lại hướng dẫn này bất cứ lúc nào trong Cài đặt.",
  },
];

const MANAGER_STEPS: TourStep[] = [
  WELCOME_STAFF,
  {
    id: "users",
    target: nav("/dashboard/users"),
    title: "Nhân sự của bạn",
    body: "Xem nhân sự trong phạm vi quản lý và bấm 'Mời qua email' để mời thêm người vào đúng phòng ban/nhóm của bạn.",
  },
  TASKS,
  MESSAGES,
  CALENDAR,
  PROFILE,
  {
    id: "done",
    title: "Sẵn sàng!",
    body: "Bạn có thể xem lại hướng dẫn này bất cứ lúc nào trong Cài đặt.",
  },
];

const EMPLOYEE_STEPS: TourStep[] = [
  WELCOME_STAFF,
  TASKS,
  MESSAGES,
  CALENDAR,
  {
    id: "priority",
    target: "priority",
    title: "Gợi ý ưu tiên",
    body: "Danh sách việc cần làm của bạn, gom theo mức ưu tiên cao / trung bình / thấp.",
  },
  PROFILE,
  {
    id: "done",
    title: "Sẵn sàng!",
    body: "Bạn có thể xem lại hướng dẫn này bất cứ lúc nào trong Cài đặt.",
  },
];

export function tourStepsFor(level: AuthorityLevel): TourStep[] {
  switch (level) {
    case "EXECUTIVE":
      return ADMIN_STEPS;
    case "DEPARTMENT_HEAD":
    case "TEAM_LEAD":
      return MANAGER_STEPS;
    default:
      return EMPLOYEE_STEPS;
  }
}
