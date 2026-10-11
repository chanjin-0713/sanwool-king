"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * 브라우저용 클라이언트. 사진·파일은 서버를 거치지 않고 여기서 바로
 * Supabase Storage 로 올립니다 (용량 제한과 타임아웃을 피하기 위해).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
