import type { MarketingCopy } from "./copy.types";

/** Every claim describes something the product does today: no invented figures, customers or quotes. */
export const VI: MarketingCopy = {
  locale: "vi",
  meta: {
    title: "Orbit - Đưa doanh nghiệp của bạn trở về quỹ đạo",
    description:
      "Orbit gom việc, con người, dự án và KPI của cả công ty về một nơi: giao việc, phối hợp liên phòng ban, nhắn tin nội bộ, lịch và phân quyền theo cơ cấu tổ chức.",
    ogLocale: "vi_VN",
  },
  a11y: {
    skipToContent: "Chuyển tới nội dung",
    backToTop: "Orbit - về đầu trang",
    sections: "Các phần của trang",
    footerLinks: "Liên kết cuối trang",
    glimpse: "Minh hoạ giao diện",
  },
  nav: [
    { href: "#features", label: "Tính năng" },
    { href: "#solutions", label: "Giải pháp" },
    { href: "#how-it-works", label: "Cách hoạt động" },
    { href: "#security", label: "Bảo mật" },
  ],
  header: { signIn: "Đăng nhập", start: "Bắt đầu" },
  hero: {
    eyebrow: "Nền tảng điều hành doanh nghiệp",
    titleBefore: "Đưa doanh nghiệp của bạn trở về",
    titleEmphasis: "quỹ đạo.",
    text: "Orbit gom việc, con người, dự án và con số của cả công ty về một nơi, để mọi phòng ban cùng chuyển động theo một nhịp và không ai lệch hướng.",
    primaryCta: "Đưa doanh nghiệp về quỹ đạo",
    secondaryCta: "Xem Orbit làm được gì",
    hasAccount: "Đã có tài khoản?",
    signIn: "Đăng nhập",
  },
  glimpse: {
    eyebrow: "Nhìn thấy tiến độ. Nắm được nhịp làm việc.",
    title: "Việc đi đến đâu, bạn thấy đến đó.",
    text: "Từ cần làm đến hoàn thành: mỗi việc có một chỗ, mỗi người biết bước tiếp theo.",

    windowTitle: "Công việc của tôi",
    caption: "Minh hoạ bảng việc của Orbit với dữ liệu mẫu.",
    priority: { high: "Cao", medium: "Vừa", low: "Thấp" },
    columns: [
      {
        name: "Cần làm",
        tasks: [
          { title: "Chuẩn bị báo giá cho khách hàng", who: "KD", priority: "high" },
          { title: "Lên lịch phỏng vấn đợt tuyển dụng", who: "NS", priority: "medium" },
        ],
      },
      {
        name: "Đang làm",
        tasks: [
          { title: "Hoàn thiện tài liệu hướng dẫn", who: "KT", priority: "medium" },
          { title: "Kiểm thử bản phát hành mới", who: "KT", priority: "high" },
        ],
      },
      {
        name: "Hoàn thành",
        tasks: [
          { title: "Đối soát số liệu tháng trước", who: "TC", priority: "low" },
          { title: "Cập nhật danh bạ nhân sự", who: "NS", priority: "low" },
        ],
      },
    ],
  },
  problem: {
    eyebrow: "Giải pháp",
    title: "Doanh nghiệp lệch quỹ đạo thường bắt đầu từ những điều nhỏ",
    text: "Khi việc, người và con số nằm rải rác ở nhiều nơi, không ai sai cả, nhưng cả công ty dần chậm lại. Orbit đặt tất cả vào một trung tâm.",
    offTitle: "Khi chưa có Orbit",
    off: [
      "Việc được giao qua tin nhắn rồi trôi mất giữa các cuộc trò chuyện.",
      "Không ai chắc ai đang làm gì, và hạn chót nào sắp đến.",
      "Dự án chung nhiều phòng ban không có một chỗ để cùng phối hợp.",
      "Hiệu quả làm việc được đánh giá cảm tính, khó đo và khó công bằng.",
    ],
    inTitle: "Khi mọi thứ về đúng quỹ đạo",
    in: [
      "Mỗi việc có người nhận, hạn chót, mức ưu tiên và checklist rõ ràng.",
      "Mọi người thấy ngay việc của mình; người quản lý nắm toàn cảnh mà không cần hỏi từng người.",
      "Dự án liên phòng ban có chỗ chung cho công việc, trao đổi và thành viên.",
      "KPI hằng tháng tính từ công việc thực tế, theo công thức do ban điều hành đặt.",
    ],
  },
  features: {
    eyebrow: "Tính năng",
    title: "Mọi thứ doanh nghiệp cần để vận hành, trong một nơi",
    text: "Từ công việc và khách hàng đến lịch họp, chấm công, nghỉ phép và tài chính theo phân quyền.",
    items: [
      {
        title: "Giao việc và theo dõi",
        text: "Giao việc cho một người hoặc cả phòng ban, kèm mức ưu tiên, hạn chót, checklist và tệp đính kèm. Người nhận chấp nhận, từ chối hoặc hoàn thành ngay trên bảng việc, và được thông báo khi có việc mới.",
      },
      {
        title: "KPI và thống kê",
        text: "Điểm KPI hằng tháng, tỷ lệ hoàn thành, khối lượng công việc và biểu đồ 7 ngày gần đây. Công thức KPI do ban điều hành thiết lập.",
      },
      {
        title: "Dự án liên phòng ban",
        text: "Một phòng chủ trì, các phòng khác được mời hỗ trợ. Mỗi dự án có công việc, kênh trao đổi và danh bạ thành viên riêng.",
      },
      {
        title: "Cơ cấu và phân quyền",
        text: "Công ty, phòng ban, nhóm. Bốn cấp quyền: điều hành, trưởng phòng, trưởng nhóm, nhân viên; mỗi cấp chỉ thấy và làm đúng phần của mình.",
      },
      {
        title: "Tin nhắn nội bộ",
        text: "Nhắn tin riêng, gửi ảnh và tệp, thu hồi tin nhắn. Tìm đồng nghiệp trong phòng chỉ với vài phím gõ.",
      },
      {
        title: "Lịch và công tác",
        text: "Lịch cá nhân, sự kiện sắp tới, chuyến công tác nhiều ngày. Quản lý có thể đề xuất lịch để nhân viên chấp nhận hoặc từ chối.",
      },
      {
        title: "Ghi chú và tập trung",
        text: "Ghi chú dạng thẻ có thể ghim nổi trên mọi trang, cùng đồng hồ Pomodoro để làm việc sâu mà không rời khỏi Orbit.",
      },
      {
        title: "Làm việc theo cách của bạn",
        text: "Nhiều tab, chia đôi màn hình, tìm nhanh bằng Ctrl+K, bốn giao diện sáng, tối, xám, hồng và một buổi hướng dẫn làm quen từng bước.",
      },
      {
        title: "Trang giới thiệu công ty",
        text: "Một trang chung cho cả công ty: ảnh bìa, mô tả và các phòng ban với biểu tượng, màu sắc riêng, để người mới hiểu ngay mình đang ở đâu.",
      },
      {
        title: "Họp cùng đồng nghiệp",
        text: "Lên lịch, mời đồng nghiệp hoặc cả phòng ban và nhóm, nhận lời mời trong Orbit rồi mở liên kết Google Meet. Bạn cung cấp link phòng họp; Orbit không tự tạo phòng.",
      },
      {
        title: "Chấm công và nghỉ phép",
        text: "Ghi nhận giờ vào, giờ ra; theo dõi chấm công theo tháng. Gửi đơn nghỉ, xem hạn mức và kết quả duyệt; ngày nghỉ được duyệt xuất hiện trên lịch.",
      },
      {
        title: "Tài chính theo phân quyền",
        text: "Lập phiếu lương, ghi thu chi và xem báo cáo dòng tiền dành cho người được cấp quyền tài chính. Phiếu lương được gửi CEO duyệt trước khi thanh toán.",
      },
      {
        title: "Khách hàng và bảng trắng",
        text: "Quản lý dữ liệu khách hàng trong CRM, dùng bảng trắng để phác thảo ý tưởng cùng công việc và dự án của nhóm.",
      },
    ],
  },
  steps: {
    eyebrow: "Cách hoạt động",
    title: "Từ đăng ký đến vận hành trong ba bước",
    items: [
      {
        title: "Tạo không gian của doanh nghiệp",
        text: "Đăng ký doanh nghiệp, xác minh email và nhận tài khoản quản trị đầu tiên.",
      },
      {
        title: "Dựng cơ cấu và mời mọi người",
        text: "Tạo phòng ban và nhóm, mời nhân sự qua email hoặc thêm trực tiếp, rồi phân chức vụ và quyền.",
      },
      {
        title: "Vận hành theo quỹ đạo",
        text: "Giao việc, theo dõi tiến độ, phối hợp dự án và xem KPI mỗi tháng, tất cả ở cùng một nơi.",
      },
    ],
  },
  roles: {
    explore: "Chọn một vai trò để xem phạm vi làm việc.",
    scope: ["Toàn doanh nghiệp", "Phòng ban của mình", "Nhóm của mình", "Công việc của mình"],
    eyebrow: "Cho cả tổ chức",
    title: "Mỗi người một vị trí, cùng một quỹ đạo",
    text: "Quyền xem và quyền làm đi theo chức vụ, nên ai cũng có đủ thông tin cho phần việc của mình, và không hơn.",
    items: [
      {
        name: "Ban điều hành",
        text: "Thấy toàn công ty: phòng ban, nhân sự, dự án liên phòng ban. Đặt công thức KPI, quản lý cơ cấu và tài khoản.",
      },
      {
        name: "Trưởng phòng",
        text: "Quản lý phòng ban của mình: giao việc, theo dõi nhân sự, chủ trì hoặc nhận lời mời tham gia dự án.",
      },
      {
        name: "Trưởng nhóm",
        text: "Giao việc và theo dõi tiến độ ngay trong nhóm của mình.",
      },
      {
        name: "Nhân viên",
        text: "Một nơi cho việc của tôi: nhận việc, checklist, lịch, ghi chú và nhắn tin cho đồng nghiệp.",
      },
    ],
  },
  security: {
    labels: ["Không gian riêng", "Đúng người, đúng quyền", "Bảo vệ phiên đăng nhập", "Lấy lại quyền truy cập"],
    eyebrow: "Bảo mật",
    title: "Dữ liệu của doanh nghiệp bạn chỉ thuộc về bạn",
    text: "Orbit được xây theo nguyên tắc bảo mật từ thiết kế: quyền được kiểm tra ở máy chủ và mỗi công ty là một ranh giới dữ liệu riêng.",
    items: [
      "Mỗi doanh nghiệp là một không gian riêng: dữ liệu giữa các công ty được tách biệt hoàn toàn.",
      "Phân quyền được kiểm tra ở máy chủ, không chỉ trên giao diện.",
      "Mật khẩu được băm một chiều, phiên đăng nhập dùng cookie httpOnly và số lần thử đăng nhập bị giới hạn.",
      "Quên mật khẩu? Mã OTP được gửi về email đã đăng ký.",
    ],
  },
  finalCta: {
    title: "Việc tiếp theo?\nĐưa cả đội vào quỹ đạo.",
    text: "Bạn đã thấy cách Orbit vận hành. Giờ là lúc tạo không gian cho doanh nghiệp của bạn và bắt đầu công việc đầu tiên.",
    primary: "Bắt đầu cùng Orbit",
    secondary: "Tôi đã có tài khoản",
  },
};
