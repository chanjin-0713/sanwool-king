import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteEventAction } from "@/app/calendar/actions";
import { ActionButton } from "@/components/delete-button";
import { EventForm } from "@/components/event-form";
import { PhotoLightbox, type LightboxPhoto } from "@/components/photo-lightbox";
import { SetupNotice } from "@/components/ui";
import { deletePhotoAction } from "@/app/gallery/actions";
import {
  addDays,
  formatDateKey,
  formatTimeRange,
  isValidDateKey,
  kstDayRange,
  parseDateKey,
  describeDistance,
  todayKey,
} from "@/lib/date";
import { signedUrlMap } from "@/lib/storage";
import { PHOTO_BUCKET, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  EVENT_CATEGORIES,
  rows,
  type Album,
  type Photo,
  type YouthEvent,
} from "@/lib/types";

type Params = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  return {
    title: isValidDateKey(date) ? formatDateKey(date) : "일정",
  };
}

interface AlbumBlock {
  album: Album;
  photos: LightboxPhoto[];
}

export default async function CalendarDayPage({ params }: Params) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const { year, month } = parseDateKey(date);
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  // 1) 이 날의 일정 (여러 날 일정도 포함)
  const { data: eventRows } = await supabase
    .from("events")
    .select("*, author:profiles(name)")
    .lte("event_date", date)
    .or(`end_date.gte.${date},and(end_date.is.null,event_date.eq.${date})`)
    .order("start_time", { ascending: true, nullsFirst: true });

  const events = rows<YouthEvent>(eventRows);

  // 2) 이 날 찍은 사진 (앨범 기준) / 3) 이 날 올라온 사진 (업로드 시각 기준)
  let dayAlbums: AlbumBlock[] = [];
  let uploadedBlocks: AlbumBlock[] = [];

  if (user) {
    const { data: albumRows } = await supabase
      .from("albums")
      .select("*, author:profiles(name)")
      .eq("event_date", date)
      .order("created_at", { ascending: true });

    const albums = rows<Album>(albumRows);
    const albumIds = albums.map((album) => album.id);

    const { from, to } = kstDayRange(date);
    const { data: uploadedRows } = await supabase
      .from("photos")
      .select("*, album:albums(id, title, event_date, description, author_id, cover_path, created_at, updated_at)")
      .gte("uploaded_at", from)
      .lt("uploaded_at", to)
      .order("uploaded_at", { ascending: true });

    const uploaded = rows<Photo & { album: Album | null }>(uploadedRows);

    const { data: photoRows } =
      albumIds.length > 0
        ? await supabase
            .from("photos")
            .select("*")
            .in("album_id", albumIds)
            .order("sort_order", { ascending: true })
            .order("uploaded_at", { ascending: true })
        : { data: [] };

    const photos = rows<Photo>(photoRows);

    const urls = await signedUrlMap(supabase, PHOTO_BUCKET, [
      ...photos.map((photo) => photo.storage_path),
      ...uploaded.map((photo) => photo.storage_path),
    ]);

    const toLightbox = (photo: Photo): LightboxPhoto => ({
      id: photo.id,
      url: urls.get(photo.storage_path) ?? null,
      fileName: photo.file_name,
      uploadedAt: photo.uploaded_at,
      width: photo.width,
      height: photo.height,
    });

    dayAlbums = albums.map((album) => ({
      album,
      photos: photos
        .filter((photo) => photo.album_id === album.id)
        .map(toLightbox),
    }));

    // 이 날 업로드된 사진 중, 위에서 이미 보여준 앨범은 빼고 묶어 보여줍니다.
    const shown = new Set(albumIds);
    const grouped = new Map<string, { album: Album; photos: LightboxPhoto[] }>();
    for (const photo of uploaded) {
      if (!photo.album || shown.has(photo.album_id)) continue;
      const bucket = grouped.get(photo.album_id);
      if (bucket) bucket.photos.push(toLightbox(photo));
      else
        grouped.set(photo.album_id, {
          album: photo.album,
          photos: [toLightbox(photo)],
        });
    }
    uploadedBlocks = [...grouped.values()];
  }

  const totalDayPhotos = dayAlbums.reduce(
    (sum, block) => sum + block.photos.length,
    0,
  );
  const today = todayKey();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={{ pathname: "/calendar", query: { y: String(year), m: String(month) } }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand"
        >
          ← {year}년 {month}월 달력
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/calendar/${addDays(date, -1)}`}
            className="btn-ghost px-3.5 py-1.5 text-xs"
          >
            ‹ 전날
          </Link>
          <Link
            href={`/calendar/${addDays(date, 1)}`}
            className="btn-ghost px-3.5 py-1.5 text-xs"
          >
            다음날 ›
          </Link>
        </div>
      </div>

      <header className="mb-10 border-b border-line pb-6">
        <p className="eyebrow mb-2">{describeDistance(date, today)}</p>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">
          {formatDateKey(date)}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          일정 {events.length}개
          {user ? ` · 이 날의 사진 ${totalDayPhotos}장` : ""}
        </p>
      </header>

      {/* 일정 */}
      <section className="mb-14">
        <h2 className="mb-4 text-lg font-bold text-ink">일정</h2>

        {events.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">이 날은 등록된 일정이 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const meta = EVENT_CATEGORIES[event.category];
              const canManage =
                !!user && (user.id === event.author_id || user.role === "admin");
              const multiDay =
                !!event.end_date && event.end_date !== event.event_date;

              return (
                <li key={event.id} className="card px-5 py-5 sm:px-6">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`chip ${meta.chip}`}>{meta.label}</span>
                    <span className="text-xs font-semibold text-ink-faint">
                      {formatTimeRange(event.start_time, event.end_time)}
                    </span>
                    {multiDay ? (
                      <span className="chip bg-surface-soft text-ink-soft">
                        {formatDateKey(event.event_date, "md")} ~{" "}
                        {formatDateKey(event.end_date!, "md")}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-ko text-lg font-bold text-ink">
                    {event.title}
                  </h3>

                  {event.location ? (
                    <p className="mt-1.5 text-sm text-ink-soft">
                      📍 {event.location}
                    </p>
                  ) : null}

                  {event.description ? (
                    <p className="text-ko mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                      {event.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-ink-faint">
                      등록 {event.author?.name ?? "청년부"}
                    </p>
                    {canManage ? (
                      <ActionButton
                        action={deleteEventAction}
                        values={{ id: event.id, date }}
                        label="삭제"
                        pendingLabel="삭제 중…"
                        confirmText={`‘${event.title}’ 일정을 삭제할까요?`}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 사진 */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">이 날의 사진</h2>

        {!user ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm text-ink-soft">
              사진은 청년부 식구들만 볼 수 있어요.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/calendar/${date}`)}`}
              className="btn-primary"
            >
              로그인하고 사진 보기
            </Link>
          </div>
        ) : dayAlbums.length === 0 && uploadedBlocks.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">
              이 날 올라온 사진이 아직 없습니다.
            </p>
            <Link
              href="/gallery"
              className="mt-4 inline-block text-sm font-semibold text-brand hover:text-brand-dark"
            >
              사진첩에서 올리기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {dayAlbums.map(({ album, photos }) => (
              <div key={album.id}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-ko text-base font-bold text-ink">
                    {album.title}
                    <span className="ml-2 text-xs font-medium text-ink-faint">
                      {photos.length}장
                    </span>
                  </h3>
                  <Link
                    href={`/gallery/${album.id}`}
                    className="text-xs font-semibold text-brand hover:text-brand-dark"
                  >
                    앨범으로 이동 →
                  </Link>
                </div>
                <PhotoLightbox
                  photos={photos}
                  albumTitle={album.title}
                  canManage={user.id === album.author_id || user.role === "admin"}
                  deleteAction={deletePhotoAction}
                />
              </div>
            ))}

            {uploadedBlocks.length > 0 ? (
              <div className="border-t border-line pt-8">
                <h3 className="mb-1 text-base font-bold text-ink">
                  이 날 업로드된 다른 사진
                </h3>
                <p className="mb-4 text-xs text-ink-faint">
                  촬영일은 다르지만 {formatDateKey(date, "md")}에 올라온 사진들입니다.
                </p>
                <div className="space-y-8">
                  {uploadedBlocks.map(({ album, photos }) => (
                    <div key={album.id}>
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-ko text-sm font-bold text-ink">
                          {album.title}
                          <span className="ml-2 text-xs font-medium text-ink-faint">
                            {formatDateKey(album.event_date, "dot")} · {photos.length}장
                          </span>
                        </h4>
                        <Link
                          href={`/gallery/${album.id}`}
                          className="text-xs font-semibold text-brand hover:text-brand-dark"
                        >
                          앨범으로 이동 →
                        </Link>
                      </div>
                      <PhotoLightbox
                        photos={photos}
                        albumTitle={album.title}
                        canManage={
                          user.id === album.author_id || user.role === "admin"
                        }
                        deleteAction={deletePhotoAction}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {user ? (
        <details className="card mt-12 px-6 py-5 sm:px-7">
          <summary className="cursor-pointer text-sm font-bold text-ink marker:text-brand">
            이 날에 일정 추가하기
          </summary>
          <div className="mt-5 border-t border-line pt-5">
            <EventForm defaultDate={date} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
