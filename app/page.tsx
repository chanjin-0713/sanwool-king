import Link from "next/link";

import { SectionTitle, SetupNotice } from "@/components/ui";
import {
  formatDateKey,
  formatTimeRange,
  timestampToDateKey,
  todayKey,
} from "@/lib/date";
import { SITE } from "@/lib/site";
import { signedUrlMap } from "@/lib/storage";
import { PHOTO_BUCKET, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  EVENT_CATEGORIES,
  rows,
  type Album,
  type Notice,
  type YouthEvent,
} from "@/lib/types";

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-brand-soft via-surface to-sage-soft px-7 py-14 sm:px-12 sm:py-20">
      <div className="relative max-w-2xl">
        <p className="eyebrow mb-4">{SITE.church} 청년부</p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-wide text-ink sm:text-6xl">
          {SITE.name}
        </h1>
        <p className="text-ko mt-4 text-lg font-semibold text-brand-dark">
          {SITE.tagline}
        </p>
        <blockquote className="text-ko mt-7 border-l-2 border-brand/40 pl-4 text-sm leading-relaxed text-ink-soft">
          “{SITE.verse.text}”
          <footer className="mt-1.5 text-xs text-ink-faint">
            — {SITE.verse.ref}
          </footer>
        </blockquote>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/calendar" className="btn-primary">
            청년부 일정 보기
          </Link>
          <Link href="/gallery" className="btn-ghost">
            사진첩 둘러보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function TimeTable({
  title,
  description,
  items,
  accent,
}: {
  title: string;
  description: string;
  items: readonly {
    readonly name: string;
    readonly day: string;
    readonly time: string;
    readonly place: string;
    readonly note: string;
  }[];
  accent: "brand" | "sage";
}) {
  return (
    <section>
      <SectionTitle title={title} description={description} />
      <ul className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.name} className="card flex flex-col px-5 py-5">
            <span
              className={`chip mb-3 self-start ${
                accent === "brand"
                  ? "bg-brand-soft text-brand-dark"
                  : "bg-sage-soft text-sage"
              }`}
            >
              {item.day}
            </span>
            <p className="text-ko text-base font-bold text-ink">{item.name}</p>
            <p className="font-display mt-1 text-2xl text-brand-dark">
              {item.time}
            </p>
            <p className="mt-2 text-sm text-ink-soft">📍 {item.place}</p>
            <p className="text-ko mt-2 text-xs leading-relaxed text-ink-faint">
              {item.note}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Intro() {
  return (
    <section className="card px-7 py-9 sm:px-10">
      <p className="eyebrow mb-3">청년부 소개</p>
      <h2 className="font-display text-3xl text-ink">
        우리는 이런 공동체입니다
      </h2>
      <div className="mt-5 space-y-4">
        {SITE.intro.map((paragraph) => (
          <p
            key={paragraph.slice(0, 12)}
            className="text-ko text-[15px] leading-[1.9] text-ink-soft"
          >
            {paragraph}
          </p>
        ))}
      </div>
      <p className="text-ko mt-6 border-t border-line pt-5 text-sm text-ink-soft">
        <strong className="font-semibold text-ink">처음 오셨나요?</strong>{" "}
        {SITE.contact.place}로 오시면 환영 안내를 받으실 수 있어요.{" "}
        {SITE.contact.inquiry}
      </p>
    </section>
  );
}

export default async function HomePage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-16">
        <Hero />
        <Intro />
        <TimeTable
          title="예배 시간"
          description="청년부가 함께 참여하는 예배입니다."
          items={SITE.services}
          accent="brand"
        />
        <TimeTable
          title="청년부 모임 시간"
          description="예배 외에 정기적으로 모이는 자리입니다."
          items={SITE.gatherings}
          accent="sage"
        />
        <SetupNotice />
      </div>
    );
  }

  const today = todayKey();
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  const [noticeResult, eventResult] = await Promise.all([
    supabase
      .from("notices")
      .select("id, title, content, is_pinned, created_at, author:profiles(name)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("events")
      .select("*")
      .or(`end_date.gte.${today},and(end_date.is.null,event_date.gte.${today})`)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .limit(4),
  ]);

  const notices = rows<Notice>(noticeResult.data);
  const upcoming = rows<YouthEvent>(eventResult.data);

  // 사진은 로그인한 청년에게만 보여줍니다.
  let recentAlbums: { album: Album; count: number; coverUrl: string | null }[] =
    [];
  if (user) {
    const { data } = await supabase
      .from("albums")
      .select("*, photos(count)")
      .order("event_date", { ascending: false })
      .limit(4);

    const albumRows =
      rows<Album & { photos: { count: number }[] | null }>(data);
    const covers = await signedUrlMap(
      supabase,
      PHOTO_BUCKET,
      albumRows.map((row) => row.cover_path).filter((p): p is string => !!p),
    );
    recentAlbums = albumRows.map((row) => ({
      album: row,
      count: row.photos?.[0]?.count ?? 0,
      coverUrl: row.cover_path ? (covers.get(row.cover_path) ?? null) : null,
    }));
  }

  return (
    <div className="space-y-16 sm:space-y-20">
      <Hero />

      {/* 공지 + 다가오는 일정 */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle
            title="최근 공지"
            action={
              <Link
                href="/notices"
                className="text-sm font-semibold text-brand hover:text-brand-dark"
              >
                전체 보기 →
              </Link>
            }
          />
          {notices.length === 0 ? (
            <div className="card px-5 py-8 text-center text-sm text-ink-soft">
              아직 올라온 공지가 없습니다.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {notices.map((notice) => (
                <li key={notice.id}>
                  <Link
                    href={`/notices/${notice.id}`}
                    className="card block px-5 py-4 transition-colors hover:border-brand/40 hover:bg-surface-soft/60"
                  >
                    <div className="flex items-center gap-2">
                      {notice.is_pinned ? (
                        <span className="chip bg-brand-soft text-brand-dark">
                          📌
                        </span>
                      ) : null}
                      <p className="text-ko min-w-0 flex-1 truncate text-sm font-bold text-ink">
                        {notice.title}
                      </p>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {formatDateKey(
                          timestampToDateKey(notice.created_at),
                          "dot",
                        )}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle
            title="다가오는 일정"
            action={
              <Link
                href="/calendar"
                className="text-sm font-semibold text-brand hover:text-brand-dark"
              >
                달력 보기 →
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <div className="card px-5 py-8 text-center text-sm text-ink-soft">
              등록된 다음 일정이 없습니다.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((event) => {
                const meta = EVENT_CATEGORIES[event.category];
                return (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/${event.event_date}`}
                      className="card flex items-center gap-3 px-5 py-4 transition-colors hover:border-brand/40 hover:bg-surface-soft/60"
                    >
                      <span className="shrink-0 text-center">
                        <span className="block text-xs font-semibold text-ink-faint">
                          {formatDateKey(event.event_date, "md")}
                        </span>
                      </span>
                      <span className={`chip shrink-0 ${meta.chip}`}>
                        {meta.label}
                      </span>
                      <span className="text-ko min-w-0 flex-1 truncate text-sm font-bold text-ink">
                        {event.title}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {formatTimeRange(event.start_time, event.end_time)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Intro />

      <TimeTable
        title="예배 시간"
        description="청년부가 함께 참여하는 예배입니다."
        items={SITE.services}
        accent="brand"
      />

      <TimeTable
        title="청년부 모임 시간"
        description="예배 외에 정기적으로 모이는 자리입니다."
        items={SITE.gatherings}
        accent="sage"
      />

      {/* 최근 사진 */}
      <section>
        <SectionTitle
          title="최근 사진"
          description="청년부가 함께한 순간들"
          action={
            <Link
              href="/gallery"
              className="text-sm font-semibold text-brand hover:text-brand-dark"
            >
              사진첩 →
            </Link>
          }
        />

        {!user ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-ko text-sm text-ink-soft">
              사진첩은 청년부 식구들만 볼 수 있어요. 로그인하면 사진을 보고
              직접 올릴 수도 있습니다.
            </p>
            <div className="flex gap-2">
              <Link href="/login" className="btn-primary">
                로그인
              </Link>
              <Link href="/signup" className="btn-ghost">
                회원가입
              </Link>
            </div>
          </div>
        ) : recentAlbums.length === 0 ? (
          <div className="card px-5 py-10 text-center text-sm text-ink-soft">
            아직 올라온 사진이 없습니다.{" "}
            <Link
              href="/gallery"
              className="font-semibold text-brand hover:text-brand-dark"
            >
              첫 앨범 만들기 →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentAlbums.map(({ album, count, coverUrl }) => (
              <li key={album.id}>
                <Link href={`/gallery/${album.id}`} className="group block">
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
                      {count}장
                    </span>
                  </div>
                  <p className="text-ko mt-2.5 line-clamp-2 text-sm font-bold leading-snug text-ink group-hover:text-brand-dark">
                    {album.title}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {formatDateKey(album.event_date, "dot")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
