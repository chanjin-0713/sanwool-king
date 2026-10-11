import type { SupabaseClient } from "@supabase/supabase-js";

import { SIGNED_URL_TTL } from "./supabase/config";

/**
 * 버킷이 비공개이므로 화면에 뿌릴 때마다 서명 URL 을 만들어 씁니다.
 * createSignedUrls 는 한 번에 많이 보내면 거절당할 수 있어 100개씩 나눕니다.
 */
export async function signedUrlMap(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return result;

  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(chunk, expiresIn);
    if (error || !data) continue;
    for (const item of data) {
      if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
    }
  }
  return result;
}

export async function signedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null,
  options?: { download?: string; expiresIn?: number },
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, options?.expiresIn ?? SIGNED_URL_TTL, {
      download: options?.download,
    });
  if (error || !data) return null;
  return data.signedUrl;
}

/** 업로드 파일명을 스토리지 경로로 안전하게 바꿉니다. */
export function toStorageFileName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase() : "";
  const random = globalThis.crypto.randomUUID();
  return ext ? `${random}.${ext}` : random;
}

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
};

/**
 * 브라우저가 파일 형식을 비워 보내는 경우(아이폰 HEIC 등)가 있어
 * 확장자로 한 번 더 추측합니다. 형식이 비면 업로드가 거부됩니다.
 */
export function guessImageMime(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_BY_EXT[ext] ?? "image/jpeg";
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)}${units[unit]}`;
}
