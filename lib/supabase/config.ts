export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * .env.local 이 아직 채워지지 않았을 때 화면이 500으로 죽는 대신
 * 안내 페이지를 보여주기 위한 플래그입니다.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

export const PHOTO_BUCKET = "photos";
export const DOCUMENT_BUCKET = "documents";

/** 서명 URL 유효 시간 (초) */
export const SIGNED_URL_TTL = 60 * 60;

export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
