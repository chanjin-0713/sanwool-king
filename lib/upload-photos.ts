import type { PhotoInput } from "@/app/gallery/actions";

import { toKoreanDbError } from "./errors";
import { guessImageMime, toStorageFileName } from "./storage";
import { createSupabaseBrowserClient } from "./supabase/client";
import { PHOTO_BUCKET } from "./supabase/config";

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 60;

/** 라이트박스에서 사진 비율을 미리 잡아두려고 가로/세로를 읽어둡니다. */
async function readDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // HEIC 처럼 브라우저가 디코딩하지 못하는 형식은 비워둡니다.
    return { width: null, height: null };
  }
}

export interface UploadOutcome {
  photos: PhotoInput[];
  failed: string[];
  error?: string;
}

/**
 * 사진 파일들을 Storage 의 `photos/<albumId>/` 아래로 올립니다.
 * 서버 액션을 거치지 않아 용량 제한 없이 한 번에 여러 장을 보낼 수 있습니다.
 */
export async function uploadPhotoFiles(
  albumId: string,
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<UploadOutcome> {
  const supabase = createSupabaseBrowserClient();
  const slots: (PhotoInput | null)[] = new Array(files.length).fill(null);
  const failed: string[] = [];

  let cursor = 0;
  let done = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= files.length) return;

      const file = files[index];
      const storagePath = `${albumId}/${toStorageFileName(file.name)}`;
      const size = await readDimensions(file);

      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || guessImageMime(file.name),
          upsert: false,
        });

      if (error) {
        failed.push(`${file.name} (${toKoreanDbError(error.message)})`);
      } else {
        slots[index] = {
          storagePath,
          fileName: file.name,
          width: size.width,
          height: size.height,
        };
      }

      done += 1;
      onProgress(done, files.length);
    }
  }

  // 교회 와이파이에서도 버티도록 동시 3개까지만 올립니다.
  await Promise.all([worker(), worker(), worker()]);

  return {
    photos: slots.filter((slot): slot is PhotoInput => slot !== null),
    failed,
  };
}

export function validatePhotoFiles(files: File[]): string | null {
  if (files.length === 0) return "사진을 한 장 이상 선택해 주세요.";
  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    return `한 번에 최대 ${MAX_PHOTOS_PER_UPLOAD}장까지 올릴 수 있습니다. (선택: ${files.length}장)`;
  }
  const tooBig = files.find((file) => file.size > MAX_PHOTO_BYTES);
  if (tooBig) return `‘${tooBig.name}’ 파일이 25MB를 넘습니다.`;
  return null;
}
