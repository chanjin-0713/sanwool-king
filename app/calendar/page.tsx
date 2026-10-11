import type { Metadata } from "next";
import Link from "next/link";

import { EventForm } from "@/components/event-form";
import { EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import {
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  buildMonthGrid,
  formatDateKey,
  formatTimeRange,
  monthBounds,
  parseDateKey,
  todayKey,
} from "@/lib/date";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { EVENT_CATEGORIES, rows, type YouthEvent } from "@/lib/types";

export const metadata: Metadata = { title: "일정" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const params = await searchParams;
  const today = todayKey();
  const todayParts = parseDateKey(today);

  const year = Number(params.y) || todayParts.year;
  const month =
    Number(params.m) >= 1 && Number(params.m) <= 12
      ? Number(params.m)
      : todayParts.month;

  const { start, end } = monthBounds(year, month);
  const weeks = buildMonthGrid(year, month);
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  // 이 달과 겹치는 일정 (여러 날 일정 포함)
  const { data: eventRows } = await supabase
    .from("events")
    .select("*, author:profiles(name)")
    .lte("event_date", end)
    .or(`end_date.gte.${start},and(end_date.is.null,event_date.gte.${start})`)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const events = rows<YouthEvent>(eventRows);

  // 이 달에 사진이 있는 날 (달력에 📷 표시)
  const { data: albumRows } = await supabase
    .from("albums")
    .select("event_date, photos(count)")
    .gte("event_date", start)
    .lte("event_date", end);

  const photoCountByDate = new Map<string, number>();
  for (const row of rows<{
    event_date: string;
    photos: { count: number }[] | null;
  }>(albumRows)) {
    const count = row.photos?.[0]?.count ?? 0;
    photoCountByDate.set(
      row.event_date,
      (photoCountByDate.get(row.event_date) ?? 0) + count,
    );
  }

  // 날짜별 일정 펼치기 (여러 날 일정은 매일 칸에 표시)
  const eventsByDate = new Map<string, YouthEvent[]>();
  for (const event of events) {
    const last = event.end_date ?? event.event_date;
    let cursor = event.event_date < start ? start : event.event_date;
    const stop = last > end ? end : last;
    while (cursor <= stop) {
      const bucket = eventsByDate.get(cursor);
      if (bucket) bucket.push(event);
      else eventsByDate.set(cursor, [event]);
      cursor = addDays(cursor, 1);
    }
  }

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  const monthEvents = events
    .slice()
    .sort((a, b) =>
      a.event_date === b.event_date
        ? (a.start_time ?? "").localeCompare(b.start_time ?? "")
        : a.event_date.localeCompare(b.event_date),
    );

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title="청년부 일정"
        description="예배·모임·수련회 일정을 한눈에. 날짜를 누르면 그날의 일정과 사진을 함께 볼 수 있습니다."
        action={
          user ? undefined : (
            <Link href="/login?next=%2Fcalendar" className="btn-ghost">
              로그인하고 일정 등록
            </Link>
          )
        }
      />

      {/* 월 이동 */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={{ pathname: "/calendar", query: { y: String(prev.year), m: String(prev.month) } }}
          className="btn-ghost px-4 py-1.5 text-sm"
          aria-label="이전 달"
        >
          ‹ 이전
        </Link>

        <div className="text-center">
          <p className="font-display text-2xl text-ink sm:text-3xl">
            {year}년 {month}월
          </p>
          {year !== todayParts.year || month !== todayParts.month ? (
            <Link
              href={{ pathname: "/calendar" }}
              className="text-xs font-semibold text-brand hover:text-brand-dark"
            >
              오늘로 돌아가기
            </Link>
          ) : (
            <p className="text-xs text-ink-faint">
              오늘 {formatDateKey(today, "mdw")}
            </p>
          )}
        </div>

        <Link
          href={{ pathname: "/calendar", query: { y: String(next.year), m: String(next.month) } }}
          className="btn-ghost px-4 py-1.5 text-sm"
          aria-label="다음 달"
        >
          다음 ›
        </Link>
      </div>

      {/* 달력 */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-surface-soft">
          {WEEKDAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={`py-2.5 text-center text-xs font-bold ${
                index === 0
                  ? "text-brand"
                  : index === 6
                    ? "text-sage"
                    : "text-ink-soft"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((cell) => {
            const dayEvents = eventsByDate.get(cell.key) ?? [];
            const photoCount = photoCountByDate.get(cell.key) ?? 0;
            const isToday = cell.key === today;

            return (
              <Link
                key={cell.key}
                href={`/calendar/${cell.key}`}
                className={`group relative flex min-h-[74px] flex-col gap-1 border-b border-r border-line-soft p-1.5 transition-colors last:border-r-0 sm:min-h-[108px] sm:p-2 ${
                  cell.inMonth
                    ? "bg-surface hover:bg-brand-soft/40"
                    : "bg-surface-soft/40 hover:bg-surface-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${
                      isToday
                        ? "bg-brand text-white"
                        : !cell.inMonth
                          ? "text-ink-faint/60"
                          : cell.weekday === 0
                            ? "text-brand"
                            : cell.weekday === 6
                              ? "text-sage"
                              : "text-ink"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {photoCount > 0 ? (
                    <span
                      className="text-[10px] font-semibold text-ink-faint"
                      title={`사진 ${photoCount}장`}
                    >
                      📷{photoCount}
                    </span>
                  ) : null}
                </div>

                {/* 모바일: 점 */}
                <div className="flex flex-wrap gap-1 sm:hidden">
                  {dayEvents.slice(0, 4).map((event) => (
                    <span
                      key={`${cell.key}-dot-${event.id}`}
                      className={`h-1.5 w-1.5 rounded-full ${EVENT_CATEGORIES[event.category].dot}`}
                    />
                  ))}
                </div>

                {/* 데스크톱: 일정 이름 */}
                <ul className="hidden min-w-0 flex-col gap-1 sm:flex">
                  {dayEvents.slice(0, 3).map((event) => (
                    <li
                      key={`${cell.key}-${event.id}`}
                      className={`truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${EVENT_CATEGORIES[event.category].chip}`}
                    >
                      {event.title}
                    </li>
                  ))}
                  {dayEvents.length > 3 ? (
                    <li className="px-1.5 text-[11px] text-ink-faint">
                      +{dayEvents.length - 3}개 더
                    </li>
                  ) : null}
                </ul>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
        {(Object.keys(EVENT_CATEGORIES) as (keyof typeof EVENT_CATEGORIES)[]).map(
          (key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${EVENT_CATEGORIES[key].dot}`}
              />
              {EVENT_CATEGORIES[key].label}
            </span>
          ),
        )}
        <span className="text-ink-faint">📷 = 그 날 사진 있음</span>
      </div>

      {/* 이번 달 일정 목록 */}
      <section className="mt-12">
        <h2 className="mb-4 border-b border-line pb-2 font-display text-2xl text-ink">
          {year}년 {month}월 일정
        </h2>

        {monthEvents.length === 0 ? (
          <EmptyState
            title="이 달에는 등록된 일정이 없습니다"
            description={
              user
                ? "아래에서 일정을 등록해 보세요."
                : "로그인하면 일정을 등록할 수 있습니다."
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {monthEvents.map((event) => {
              const meta = EVENT_CATEGORIES[event.category];
              return (
                <li key={event.id}>
                  <Link
                    href={`/calendar/${event.event_date}`}
                    className="card flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors hover:border-brand/40 hover:bg-surface-soft/60"
                  >
                    <span className="w-24 shrink-0 text-sm font-bold text-ink">
                      {formatDateKey(event.event_date, "mdw")}
                    </span>
                    <span className={`chip ${meta.chip}`}>{meta.label}</span>
                    <span className="text-ko min-w-0 flex-1 text-sm font-semibold text-ink">
                      {event.title}
                      {event.end_date && event.end_date !== event.event_date
                        ? ` ~ ${formatDateKey(event.end_date, "md")}`
                        : ""}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {formatTimeRange(event.start_time, event.end_time)}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {user ? (
        <details className="card mt-8 px-6 py-5 sm:px-7">
          <summary className="cursor-pointer text-sm font-bold text-ink marker:text-brand">
            일정 등록하기
          </summary>
          <div className="mt-5 border-t border-line pt-5">
            <EventForm
              defaultDate={
                year === todayParts.year && month === todayParts.month
                  ? today
                  : start
              }
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
