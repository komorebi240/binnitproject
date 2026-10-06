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
  body: "Nhận hoặc từ chối việc được giao, theo dõi và hoàn thành việc của bạn. Bấm vào một việc để xem chi tiết, tệp đính kèm và link Google Drive. Việc có checklist tự hoàn thành khi bạn tick đủ các dòng; dấu + để tự thêm việc cho mình (không cần ai duyệt). Người giao việc được báo khi bạn nhận, từ chối hoặc hoàn thành.",
};

const MESSAGES: TourStep = {
  id: "messages",
  target: nav("/dashboard/messages"),
  title: "Tin nhắn",
  body: "Chat 1-1 với đồng nghiệp: gõ vào ô tìm kiếm để thấy ngay người cùng phòng ban và bắt đầu trò chuyện, gửi ảnh (bấm để xem lớn) và tệp, thu hồi tin đã gửi, lưu trữ hội thoại không cần đến.",
};

const CALENDAR: TourStep = {
  id: "calendar",
  target: nav("/dashboard/calendar"),
  title: "Lịch của tôi",
  body: "Xem lịch tháng và bấm vào một ngày để xem sự kiện của ngày đó. Phía dưới là các sự kiện sắp tới. Thêm sự kiện bằng dấu +; loại 'Công tác' cho chọn từ ngày nào đến ngày nào. Xác nhận hoặc từ chối sự kiện người khác thêm cho bạn.",
};

const SEARCH: TourStep = {
  id: "search",
  target: "search",
  title: "Tìm kiếm nhanh",
  body: "Bấm hoặc nhấn Ctrl+K rồi gõ tên một trang hoặc một tính năng nhỏ bên trong (ví dụ 'checklist', 'đổi mật khẩu'): kết quả hiện trang chứa nó, bên dưới là tính năng đó, từ khoá được tô sáng và không cần gõ dấu.",
};

const PROJECTS: TourStep = {
  id: "projects",
  target: nav("/dashboard/projects"),
  title: "Dự án chung nhiều phòng ban",
  body: "Khi một việc cần nhiều phòng cùng làm: phòng chủ trì tạo dự án và mời phòng khác hỗ trợ. Trưởng phòng được mời nhận lời rồi chọn người của mình; cả hai phòng cùng có công việc, trao đổi nhóm, thư mục Drive chung và danh bạ thành viên.",
};

const NOTES: TourStep = {
  id: "notes",
  target: nav("/dashboard/notes"),
  title: "Note của tôi",
  body: "Ghi chú riêng của bạn, hiện dạng thẻ và tìm được theo từ khoá. Bấm một thẻ để mở rộng và sửa; ghim để note nổi ở mọi trang cho tới khi bỏ ghim.",
};

const TIMER: TourStep = {
  id: "timer",
  target: "timer",
  title: "Đồng hồ tập trung",
  body: "Đồng hồ Pomodoro: làm việc tập trung theo từng phiên, nghỉ ngắn giữa các phiên. Đồng hồ vẫn chạy khi bạn đóng cửa sổ hoặc chuyển trang.",
};

const NOTIFICATIONS: TourStep = {
  id: "notifications",
  target: "notifications",
  title: "Thông báo",
  body: "Việc mới được giao, người nhận hoặc hoàn thành việc bạn giao, tin nhắn, lịch cần xác nhận và yêu cầu Drive. Bấm vào thông báo để tới đúng chỗ.",
};

const BOARD_VIEW: TourStep = {
  id: "board-view",
  target: "board-view",
  title: "Xem việc dạng cột",
  body: "Chuyển trang chủ giữa tổng quan KPI và bảng việc Cần làm / Đang làm / Hoàn thành.",
};

const SPLIT_SCREEN: TourStep = {
  id: "split-screen",
  target: "split-screen",
  title: "Chia đôi màn hình",
  body: "Mở hai trang cạnh nhau. Mỗi tab thuộc một nửa; kéo tab sang nửa kia để chuyển, kéo thanh giữa để chỉnh độ rộng. Bấm logo Orbit bất cứ lúc nào để về trang chủ.",
};

const COMPANY: TourStep = {
  id: "company-page",
  target: "company",
  title: "Trang giới thiệu công ty",
  body: "Bấm logo hoặc tên công ty ở góc trên để xem giới thiệu, ảnh bìa và các phòng ban. Quản trị viên có sẵn nút cài đặt nhanh ngay trên trang: sửa thông tin, đổi logo, đổi ảnh bìa.",
};

const DEPARTMENTS: TourStep = {
  id: "departments-browse",
  target: nav("/dashboard/departments"),
  title: "Phòng ban",
  body: "Xem các phòng ban và danh bạ nhân sự từng phòng; bấm tên một người để nhắn tin riêng hoặc gửi yêu cầu Drive.",
};

const PROFILE: TourStep = {
  id: "profile",
  target: "profile",
  title: "Menu tài khoản",
  body: "Bấm ảnh đại diện để đổi nhanh trạng thái (trực tuyến / hạn chế / không làm phiền), mở Cài đặt (giao diện, mật khẩu, email khôi phục), đổi ảnh đại diện hoặc đăng xuất.",
};

const ADMIN_STEPS: TourStep[] = [
  WELCOME_ADMIN,
  COMPANY,
  {
    id: "company",
    target: "profile",
    title: "Thiết lập doanh nghiệp",
    body: "Bấm ảnh đại diện > Cài đặt (hoặc nút cài đặt nhanh ở trang công ty) để tải logo và ảnh bìa, đổi tên, email và giới thiệu doanh nghiệp, chọn giao diện. Cũng ở menu này: đổi trạng thái, đổi ảnh đại diện, đăng xuất.",
  },
  {
    id: "departments",
    target: nav("/dashboard/departments"),
    title: "Phòng ban & nhóm",
    body: "Tạo cơ cấu tổ chức trước: bấm 'Tạo phòng ban', chọn màu và biểu tượng riêng cho từng phòng, rồi thêm nhóm. Trong một phòng ban có nút + để thêm nhanh nhân sự vào đúng phòng đó.",
  },
  {
    id: "users",
    target: nav("/dashboard/users"),
    title: "Mời nhân sự",
    body: "Trong Nhân sự, bấm 'Mời qua email': người nhận mở liên kết và tự đặt tên đăng nhập, mật khẩu. Dấu + để tự tạo tài khoản. Bấm tên một nhân sự để mở cửa sổ quản lý: phòng ban và chức vụ, KPI, lịch, đặt lại mật khẩu, đổi email.",
  },
  TASKS,
  PROJECTS,
  MESSAGES,
  CALENDAR,
  NOTES,
  {
    id: "drive",
    target: nav("/dashboard/drive"),
    title: "Google Drive",
    body: "Kết nối Drive và quản lý quyền truy cập thư mục theo phòng ban.",
  },
  SEARCH,
  NOTIFICATIONS,
  TIMER,
  BOARD_VIEW,
  SPLIT_SCREEN,
  {
    id: "done",
    title: "Sẵn sàng!",
    body: "Việc nên làm đầu tiên: tạo phòng ban, rồi mời nhân sự vào đúng phòng ban. Xem lại hướng dẫn này bất cứ lúc nào trong Cài đặt.",
  },
];

const MANAGER_STEPS: TourStep[] = [
  WELCOME_STAFF,
  COMPANY,
  {
    id: "users",
    target: nav("/dashboard/users"),
    title: "Nhân sự của bạn",
    body: "Xem nhân sự trong phạm vi quản lý, bấm tên để mở cửa sổ quản lý, và bấm 'Mời qua email' để mời thêm người vào đúng phòng ban/nhóm của bạn.",
  },
  DEPARTMENTS,
  TASKS,
  PROJECTS,
  MESSAGES,
  CALENDAR,
  NOTES,
  SEARCH,
  NOTIFICATIONS,
  TIMER,
  SPLIT_SCREEN,
  PROFILE,
  {
    id: "done",
    title: "Sẵn sàng!",
    body: "Bạn có thể xem lại hướng dẫn này bất cứ lúc nào trong Cài đặt.",
  },
];

const EMPLOYEE_STEPS: TourStep[] = [
  WELCOME_STAFF,
  COMPANY,
  DEPARTMENTS,
  TASKS,
  PROJECTS,
  MESSAGES,
  CALENDAR,
  NOTES,
  SEARCH,
  NOTIFICATIONS,
  TIMER,
  BOARD_VIEW,
  SPLIT_SCREEN,
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
