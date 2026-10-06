import { ApiRequestError } from "@/lib/api/client";

/** Vietnamese text for the backend error codes users actually hit on the public onboarding forms. */
const MESSAGES: Record<string, string> = {
  INVALID_OTP: "Mã không đúng, đã hết hạn hoặc đã nhập sai quá nhiều lần. Hãy gửi lại mã mới.",
  INVALID_VERIFICATION: "Phiên xác minh email đã hết hạn hoặc đã được dùng. Vui lòng xác minh lại email.",
  EMAIL_ALREADY_REGISTERED: "Email này đã thuộc một tài khoản. Hãy đăng nhập, hoặc dùng \"Quên mật khẩu\" nếu bạn không nhớ mật khẩu.",
  USERNAME_TAKEN: "Tên đăng nhập này đã được sử dụng, hãy chọn tên khác.",
  EMAIL_SERVICE_UNAVAILABLE: "Dịch vụ gửi email chưa sẵn sàng. Vui lòng thử lại sau.",
  TOO_MANY_REQUESTS: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  INVITATION_INVALID: "Lời mời này không hợp lệ hoặc đã hết hạn.",
  INVITATION_SCOPE_INVALID: "Phòng ban hoặc nhóm của lời mời không còn tồn tại. Hãy nhờ người mời gửi lời mời mới.",
};

export function onboardingErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    return MESSAGES[err.code] ?? err.message;
  }
  return fallback;
}
