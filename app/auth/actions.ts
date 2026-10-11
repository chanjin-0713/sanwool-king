"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toKoreanAuthError, type FormState } from "@/lib/errors";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 로그인 후 돌아갈 경로. 외부 주소로 튕기지 않도록 "/" 로 시작하는 값만 허용 */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase 연결 정보가 아직 설정되지 않았습니다." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: toKoreanAuthError(error.message) };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase 연결 정보가 아직 설정되지 않았습니다." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const next = safeNext(formData.get("next"));

  if (!name) return { error: "이름을 입력해 주세요." };
  if (name.length > 20) return { error: "이름은 20자 이내로 입력해 주세요." };
  if (!email) return { error: "이메일을 입력해 주세요." };
  if (password.length < 6) {
    return { error: "비밀번호는 6자 이상으로 입력해 주세요." };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호가 서로 다릅니다. 다시 확인해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: toKoreanAuthError(error.message) };

  // 이메일 인증이 꺼져 있으면 바로 세션이 생깁니다.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  return {
    message: `${email} 로 인증 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료해 주세요.`,
  };
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
