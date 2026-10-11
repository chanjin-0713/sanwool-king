import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { deleteAlbumAction, deletePhotoAction } from "@/app/gallery/actions";
import { ActionButton } from "@/components/delete-button";
import { PhotoAppendForm } from "@/components/photo-append-form";
import { PhotoLightbox, type LightboxPhoto } from "@/components/photo-lightbox";
import { EmptyState, SetupNotice } from "@/components/ui";
import { formatDateKey, formatTimestamp } from "@/lib/date";
import { signedUrlMap } from "@/lib/storage";
import { PHOTO_BUCKET, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { firstRow, rows, type Album, type Photo } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function loadAlbum(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data: albumRows } = await supabase
    .from("albums")
    .select("*, author:profiles(name)")
    .eq("id", id)
    .limit(1);
  const album = firstRow<Album>(albumRows);
  if (!album) return null;

  const { data: photoRows } = await supabase
    .from("photos")
    .select("*")
    .eq("album_id", id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  return { album, photos: rows<Photo>(photoRows) };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isSupabaseConfigured) return { title: "사진첩" };
  const { id } = await params;
  const loaded = await loadAlbum(id);
  return { title: loaded?.album.title ?? "사진첩" };
}

export default async function AlbumPage({ params }: Params) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/gallery/${id}`)}`);

  const loaded = await loadAlbum(id);
  if (!loaded) notFound();

  const { album, photos } = loaded;
  const supabase = await createSupabaseServerClient();
  const urls = await signedUrlMap(
    supabase,
    PHOTO_BUCKET,
    photos.map((photo) => photo.storage_path),
  );

  const lightboxPhotos: LightboxPhoto[] = photos.map((photo) => ({
    id: photo.id,
    url: urls.get(photo.storage_path) ?? null,
    fileName: photo.file_name,
    uploadedAt: photo.uploaded_at,
    width: photo.width,
    height: photo.height,
  }));

  const canManage = user.id === album.author_id || user.role === "admin";
  const firstUpload = photos[0]?.uploaded_at ?? album.created_at;

  return (
    <div>
      <Link
        href="/gallery"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand"
      >
        ← 사진첩
      </Link>

      <header className="mb-8 border-b border-line pb-6">
        <p className="eyebrow mb-2">
          {formatDateKey(album.event_date)} · 사진 {photos.length}장
        </p>
        <h1 className="text-ko font-display text-3xl leading-tight text-ink sm:text-4xl">
          {album.title}
        </h1>
        {album.description ? (
          <p className="text-ko mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {album.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
          <span>올린 사람 {album.author?.name ?? "청년부"}</span>
          <span>업로드 {formatTimestamp(firstUpload)}</span>
          <Link
            href={`/calendar/${album.event_date}`}
            className="font-semibold text-brand hover:text-brand-dark"
          >
            이 날 일정 보기 →
          </Link>
        </div>
      </header>

      {photos.length === 0 ? (
        <EmptyState
          title="이 앨범에는 아직 사진이 없습니다"
          description="아래에서 사진을 추가해 주세요."
        />
      ) : (
        <PhotoLightbox
          photos={lightboxPhotos}
          albumTitle={album.title}
          canManage={canManage}
          deleteAction={deletePhotoAction}
        />
      )}

      <details className="card mt-10 px-6 py-5 sm:px-7">
        <summary className="cursor-pointer text-sm font-bold text-ink marker:text-brand">
          이 앨범에 사진 더 올리기
        </summary>
        <div className="mt-5 border-t border-line pt-5">
          <PhotoAppendForm albumId={album.id} />
        </div>
      </details>

      {canManage ? (
        <div className="mt-6 border-t border-line pt-6">
          <ActionButton
            action={deleteAlbumAction}
            values={{ id: album.id }}
            label="앨범 전체 삭제"
            pendingLabel="삭제 중…"
            confirmText={`‘${album.title}’ 앨범과 사진 ${photos.length}장을 모두 삭제할까요? 되돌릴 수 없습니다.`}
          />
        </div>
      ) : null}
    </div>
  );
}
