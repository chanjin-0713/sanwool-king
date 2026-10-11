import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Role } from "../types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * 서버 컴포넌트 / 서버 액션용 클라이언트.
 * 쿠키를 그대로 전달하므로 RLS 정책이 로그인한 사람 기준으로 적용됩니다.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다.
          // 세션 갱신은 middleware.ts 가 담당하므로 무시해도 안전합니다.
        }
      },
    },
  });
}

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string;
  role: Role;
}

/** 로그인한 사람 정보 (+ profiles 의 이름/권한). 비로그인이면 null */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .limit(1);

  const profile = (data?.[0] ?? null) as { name: string; role: Role } | null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.name ?? user.email?.split("@")[0] ?? "청년",
    role: profile?.role ?? "member",
  };
}

/** 글쓰기 전 로그인 확인용. 로그인 안 했으면 에러 메시지를 반환합니다. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: "로그인이 필요합니다. 먼저 로그인해 주세요." } as const;
  }
  return { user, error: null } as const;
}
