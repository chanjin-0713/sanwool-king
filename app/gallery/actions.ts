"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toKoreanDbError } from "@/lib/errors";
import { PHOTO_BUCKET } from "@/lib/supabase/config";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export interface AlbumInput {
  title: string;
  description: string;
  eventDate: string;
}

export interface PhotoInput {
  storagePath: string;
  fileName: string;
  width: number | null;
  height: number | null;
}

/** 1단계: 앨범(사진 묶음)을 먼저 만들고 id 를 돌려줍니다. */
export async function createAlbumAction(
  input: AlbumInput,
): Promise<{ albumId?: string; error?: string }> {
  const { user, error: authError } = await requireUser();
  if (!user) return { error: authError };

  const title = input.title.trim();
  if (!title) return { error: "앨범 제목을 입력해 주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) {
    return { error: "사진을 찍은 날짜를 선택해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("albums")
    .insert({
      title,
      description: input.description.trim() || null,
      event_date: input.eventDate,
      author_id: user.id,
    })
    .select("id")
    .limit(1);

  if (error) return { error: toKoreanDbError(error.message) };

  const albumId = (data?.[0] as { id: string } | undefined)?.id;
  if (!albumId) return { error: "앨범을 만들지 못했습니다. 다시 시도해 주세요." };

  return { albumId };
}

/**
 * 2단계: 브라우저에서 Storage 로 올린 사진들을 앨범에 등록합니다.
 * uploaded_at 은 DB 기본값(now())으로 기록됩니다.
 */
export async function addPhotosAction(
  albumId: string,
  photos: PhotoInput[],
): Promise<{ error?: string; added?: number }> {
  const { user, error: authError } = await requireUser();
  if (!user) return { error: authError };
  if (!albumId) return { error: "앨범 정보를 찾을 수 없습니다." };
  if (photos.length === 0) return { error: "등록할 사진이 없습니다." };

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("photos")
    .select("sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const offset =
    ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("photos").insert(
    photos.map((photo, index) => ({
      album_id: albumId,
      storage_path: photo.storagePath,
      file_name: photo.fileName,
      width: photo.width,
      height: photo.height,
      sort_order: offset + index,
      uploaded_by: user.id,
    })),
  );

  if (error) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(photos.map((p) => p.storagePath));
    return { error: toKoreanDbError(error.message) };
  }

  // 대표 사진이 비어 있으면 첫 장으로 채웁니다.
  const { data: album } = await supabase
    .from("albums")
    .select("cover_path")
    .eq("id", albumId)
    .limit(1);
  const coverPath = (album?.[0] as { cover_path: string | null } | undefined)
    ?.cover_path;
  if (!coverPath) {
    await supabase
      .from("albums")
      .update({ cover_path: photos[0].storagePath })
      .eq("id", albumId);
  }

  revalidatePath("/gallery");
  revalidatePath(`/gallery/${albumId}`);
  revalidatePath("/");
  return { added: photos.length };
}

/** 앨범을 아예 지웁니다 (사진 행은 cascade, 파일은 아래에서 직접 삭제). */
export async function deleteAlbumAction(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;

  const albumId = String(formData.get("id") ?? "");
  if (!albumId) return;

  const supabase = await createSupabaseServerClient();
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("album_id", albumId);

  // 파일을 먼저 지웁니다. 스토리지 삭제 권한이 "이 앨범을 만든 사람"인지를
  // albums 행으로 확인하기 때문에, 앨범을 먼저 지우면 파일이 남습니다.
  const paths = ((photos ?? []) as { storage_path: string }[]).map(
    (p) => p.storage_path,
  );
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
  }

  const { error } = await supabase.from("albums").delete().eq("id", albumId);
  if (error) return;

  revalidatePath("/gallery");
  revalidatePath("/");
  redirect("/gallery");
}

/** 사진 한 장만 삭제 */
export async function deletePhotoAction(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;

  const photoId = String(formData.get("id") ?? "");
  if (!photoId) return;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("photos")
    .select("storage_path, album_id")
    .eq("id", photoId)
    .limit(1);
  const photo = data?.[0] as
    | { storage_path: string; album_id: string }
    | undefined;
  if (!photo) return;

  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) return;

  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);

  // 지운 사진이 대표 사진이었다면 남은 사진 중 첫 장으로 바꿉니다.
  const { data: album } = await supabase
    .from("albums")
    .select("cover_path")
    .eq("id", photo.album_id)
    .limit(1);
  const coverPath = (album?.[0] as { cover_path: string | null } | undefined)
    ?.cover_path;

  if (coverPath === photo.storage_path) {
    const { data: next } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("album_id", photo.album_id)
      .order("sort_order", { ascending: true })
      .limit(1);
    await supabase
      .from("albums")
      .update({
        cover_path:
          (next?.[0] as { storage_path: string } | undefined)?.storage_path ??
          null,
      })
      .eq("id", photo.album_id);
  }

  revalidatePath("/gallery");
  revalidatePath(`/gallery/${photo.album_id}`);
  revalidatePath("/");
}
