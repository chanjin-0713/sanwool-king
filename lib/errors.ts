/** Supabase 가 돌려주는 영어 오류 메시지를 한국어 안내로 바꿉니다. */
export function toKoreanAuthError(message: string | undefined | null): string {
  const raw = message ?? "";
  if (/invalid login credentials/i.test(raw))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/email not confirmed/i.test(raw))
    return "이메일 인증이 아직 완료되지 않았습니다. 받은 메일의 링크를 눌러주세요.";
  if (/already registered|already been registered|user already/i.test(raw))
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (/password should be at least/i.test(raw))
    return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (/unable to validate email|invalid email/i.test(raw))
    return "이메일 형식을 확인해 주세요.";
  if (/rate limit|too many requests|for security purposes/i.test(raw))
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (/signups not allowed|signup is disabled/i.test(raw))
    return "현재 회원가입이 닫혀 있습니다. 청년부 임원진에게 문의해 주세요.";
  return raw || "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

/** 데이터 저장 중 생긴 오류를 사용자용 문장으로 */
export function toKoreanDbError(message: string | undefined | null): string {
  const raw = message ?? "";
  if (/row-level security|violates row-level/i.test(raw))
    return "권한이 없습니다. 작성자 또는 관리자만 할 수 있어요.";
  if (/duplicate key/i.test(raw)) return "이미 등록된 항목입니다.";
  if (/violates check constraint/i.test(raw))
    return "입력한 값을 다시 확인해 주세요.";
  if (/exceeded the maximum allowed size|payload too large/i.test(raw))
    return "파일 용량이 너무 큽니다. (한 개당 25MB 이하)";
  if (/mime type .* is not supported/i.test(raw))
    return "지원하지 않는 파일 형식입니다.";
  return raw || "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export type FormState = { error?: string | null; message?: string | null };

export const emptyFormState: FormState = {};
