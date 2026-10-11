import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 회원가입 인증 메일의 링크가 돌아오는 자리 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code && isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const failure = new URL("/login", origin);
  failure.searchParams.set(
    "error",
    "인증 링크가 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.",
  );
  return NextResponse.redirect(failure);
}
