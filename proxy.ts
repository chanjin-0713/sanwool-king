import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./lib/supabase/config";

/**
 * Next.js 16 의 proxy (이전 이름: middleware).
 *
 * 사진과 주보는 교우들의 얼굴·개인 정보가 담길 수 있으므로 로그인한 청년만
 * 볼 수 있게 합니다. 소개·공지·달력은 누구나 볼 수 있습니다.
 */
const LOGIN_REQUIRED = ["/gallery", "/bulletins", "/notices/new"];

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 세션 갱신을 겸합니다. 이 호출을 빼면 토큰이 만료된 뒤 로그아웃됩니다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsLogin = LOGIN_REQUIRED.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!user && needsLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
