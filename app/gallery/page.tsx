import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AlbumUploadForm } from "@/components/album-upload-form";
import { EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatDateKey, parseDateKey, timestampToDateKey } from "@/lib/date";
import { signedUrlMap } from "@/lib/storage";
import { PHOTO_BUCKET, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { rows as toRows, type Album } from "@/lib/types";

export const metadata: Metadata = { title: "사진첩" };

type AlbumRow = Album & { photos: { count: number }[] | null };

interface GalleryItem {
  album: Album;
  photoCount: number;
  dateKey: string;
  year: number;
  month: number;
  coverUrl: string | null;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; by?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fgallery");

  const params = await searchParams;
  const groupBy = params.by === "upload" ? "upload" : "event";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("albums")
    .select("*, author:profiles(name), photos(count)")
    .order(groupBy === "upload" ? "created_at" : "event_date", {
      ascending: false,
    })
    .limit(500);

  const rows = toRows<AlbumRow>(data);

  const covers = await signedUrlMap(
    supabase,
    PHOTO_BUCKET,
    rows.map((row) => row.cover_path).filter((p): p is string => !!p),
  );

  const items: GalleryItem[] = rows.map((row) => {
    const dateKey =
      groupBy === "upload"
        ? timestampToDateKey(row.created_at)
        : row.event_date;
    const { year, month } = parseDateKey(dateKey);
    return {
      album: row,
      photoCount: row.photos?.[0]?.count ?? 0,
      dateKey,
      year,
      month,
      coverUrl: row.cover_path ? (covers.get(row.cover_path) ?? null) : null,
    };
  });

  // 연도 → 월 목록 (필터 탭에 쓸 실제 데이터가 있는 구간만)
  const yearMap = new Map<number, Set<number>>();
  for (const item of items) {
    if (!yearMap.has(item.year)) yearMap.set(item.year, new Set());
    yearMap.get(item.year)!.add(item.month);
  }
  const years = [...yearMap.keys()].sort((a, b) => b - a);

  const selectedYear = params.year ? Number(params.year) : null;
  const validYear =
    selectedYear !== null && yearMap.has(selectedYear) ? selectedYear : null;
  const selectedMonth = params.month ? Number(params.month) : null;
  const validMonth =
    validYear !== null &&
    selectedMonth !== null &&
    yearMap.get(validYear)!.has(selectedMonth)
      ? selectedMonth
      : null;

  const filtered = items.filter(
    (item) =>
      (validYear === null || item.year === validYear) &&
      (validMonth === null || item.month === validMonth),
  );

  // "2026년 10월" 단위로 묶기
  const groups: { year: number; month: number; items: GalleryItem[] }[] = [];
  for (const item of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.year === item.year && last.month === item.month) {
      last.items.push(item);
    } else {
      groups.push({ year: item.year, month: item.month, items: [item] });
    }
  }

  const monthsOfYear =
    validYear !== null
      ? [...yearMap.get(validYear)!].sort((a, b) => b - a)
      : [];

  const totalPhotos = items.reduce((sum, item) => sum + item.photoCount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Album"
        title="사진첩"
        description={`청년부가 함께한 순간들입니다. 앨범 ${items.length}개 · 사진 ${totalPhotos}장. 썸네일을 누르면 크게 보고, 같이 올린 사진들을 넘겨볼 수 있어요.`}
      />

      <details className="card mb-8 px-6 py-5 sm:px-7">
        <summary className="cursor-pointer text-sm font-bold text-ink marker:text-brand">
          사진 올리기
        </summary>
        <div className="mt-5 border-t border-line pt-5">
          <AlbumUploadForm />
        </div>
      </details>

      {items.length === 0 ? (
        <EmptyState
          title="아직 올라온 사진이 없습니다"
          description="위의 ‘사진 올리기’를 열어 첫 앨범을 만들어보세요. 한 번에 여러 장을 올릴 수 있습니다."
        />
      ) : (
        <>
          {/* 분류 기준 */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-faint">
              분류 기준
            </span>
            {(
              [
                { value: "event", label: "사진 찍은 날" },
                { value: "upload", label: "업로드한 날" },
              ] as const
            ).map((option) => (
              <Link
                key={option.value}
                href={
                  option.value === "event"
                    ? { pathname: "/gallery" }
                    : { pathname: "/gallery", query: { by: "upload" } }
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  groupBy === option.value
                    ? "bg-ink text-cream"
                    : "border border-line bg-surface text-ink-soft hover:bg-surface-soft"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>

          {/* 연도 */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Link
              href={
                groupBy === "upload"
                  ? { pathname: "/gallery", query: { by: "upload" } }
                  : { pathname: "/gallery" }
              }
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                validYear === null
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-ink-soft hover:bg-surface-soft"
              }`}
            >
              전체
            </Link>
            {years.map((year) => (
              <Link
                key={year}
                href={{
                  pathname: "/gallery",
                  query:
                    groupBy === "upload"
                      ? { by: "upload", year: String(year) }
                      : { year: String(year) },
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  validYear === year
                    ? "bg-brand text-white"
                    : "border border-line bg-surface text-ink-soft hover:bg-surface-soft"
                }`}
              >
                {year}년
              </Link>
            ))}
          </div>

          {/* 월 */}
          {validYear !== null ? (
            <div className="mb-8 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
              <Link
                href={{
                  pathname: "/gallery",
                  query:
                    groupBy === "upload"
                      ? { by: "upload", year: String(validYear) }
                      : { year: String(validYear) },
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  validMonth === null
                    ? "bg-brand-soft text-brand-dark"
                    : "text-ink-soft hover:bg-surface-soft"
                }`}
              >
                {validYear}년 전체
              </Link>
              {monthsOfYear.map((month) => (
                <Link
                  key={month}
                  href={{
                    pathname: "/gallery",
                    query:
                      groupBy === "upload"
                        ? {
                            by: "upload",
                            year: String(validYear),
                            month: String(month),
                          }
                        : { year: String(validYear), month: String(month) },
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    validMonth === month
                      ? "bg-brand-soft text-brand-dark"
                      : "text-ink-soft hover:bg-surface-soft"
                  }`}
                >
                  {month}월
                </Link>
              ))}
            </div>
          ) : (
            <div className="mb-8" />
          )}

          {groups.map((group) => (
            <section key={`${group.year}-${group.month}`} className="mb-12">
              <h2 className="mb-4 flex items-baseline gap-2 border-b border-line pb-2">
                <span className="font-display text-2xl text-ink">
                  {group.year}년 {group.month}월
                </span>
                <span className="text-xs text-ink-faint">
                  앨범 {group.items.length}개
                </span>
              </h2>

              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map(({ album, photoCount, coverUrl, dateKey }) => (
                  <li key={album.id}>
                    <Link
                      href={`/gallery/${album.id}`}
                      className="group block"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-soft">
                        {coverUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={coverUrl}
                            alt={album.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl text-ink-faint">
                            📷
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-cream backdrop-blur-sm">
                          {photoCount}장
                        </span>
                      </div>
                      <p className="text-ko mt-2.5 line-clamp-2 text-sm font-bold leading-snug text-ink group-hover:text-brand-dark">
                        {album.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {formatDateKey(dateKey, "dot")}
                        {album.author?.name ? ` · ${album.author.name}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {filtered.length === 0 ? (
            <EmptyState
              title="이 기간에는 사진이 없습니다"
              description="다른 연도나 월을 선택해 보세요."
            />
          ) : null}
        </>
      )}
    </div>
  );
}
