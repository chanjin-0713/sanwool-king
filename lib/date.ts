/**
 * 날짜 유틸.
 *
 * 일정(events)과 앨범 날짜는 "YYYY-MM-DD" 문자열로만 다룹니다. 서버가 어느
 * 타임존에서 돌든 10월 11일이 10월 10일로 밀리는 일이 없게 하기 위함입니다.
 * 반면 사진 업로드 시각(uploaded_at)은 timestamptz 이므로 한국 시간으로
 * 변환해서 보여줍니다.
 */

export const TIME_ZONE = "Asia/Seoul";
const KST_OFFSET = "+09:00";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timestampFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const pad = (n: number) => String(n).padStart(2, "0");

/** 지금 한국 날짜 ("2026-10-11") */
export function todayKey(): string {
  return dateKeyFormatter.format(new Date());
}

/** timestamptz 값을 한국 기준 날짜 키로 */
export function timestampToDateKey(iso: string): string {
  return dateKeyFormatter.format(new Date(iso));
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function keyFromUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  return keyFromUtc(new Date(Date.UTC(year, month - 1, day + days)));
}

export function addMonths(year: number, month: number, delta: number) {
  const zero = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

export function weekdayOf(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 해당 월의 첫날 / 마지막날 키 */
export function monthBounds(year: number, month: number) {
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  };
}

/** uploaded_at 같은 timestamptz 를 "그 날 하루" 범위로 질의할 때 쓰는 경계값 */
export function kstDayRange(key: string) {
  return {
    from: `${key}T00:00:00${KST_OFFSET}`,
    to: `${addDays(key, 1)}T00:00:00${KST_OFFSET}`,
  };
}

export interface MonthCell {
  key: string;
  day: number;
  inMonth: boolean;
  weekday: number;
}

/** 일요일 시작 달력 격자 (주 단위 배열) */
export function buildMonthGrid(year: number, month: number): MonthCell[][] {
  const { start } = monthBounds(year, month);
  let cursor = addDays(start, -weekdayOf(start));

  const weeks: MonthCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      const parts = parseDateKey(cursor);
      week.push({
        key: cursor,
        day: parts.day,
        inMonth: parts.year === year && parts.month === month,
        weekday: i,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  // 전부 다음 달인 마지막 주는 버립니다.
  while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) {
    weeks.pop();
  }
  return weeks;
}

export function formatDateKey(
  key: string,
  style: "full" | "dot" | "md" | "mdw" = "full",
): string {
  const { year, month, day } = parseDateKey(key);
  const weekday = WEEKDAY_LABELS[weekdayOf(key)];
  switch (style) {
    case "dot":
      return `${year}.${pad(month)}.${pad(day)}`;
    case "md":
      return `${month}월 ${day}일`;
    case "mdw":
      return `${month}월 ${day}일 (${weekday})`;
    default:
      return `${year}년 ${month}월 ${day}일 (${weekday})`;
  }
}

/** "19:30:00" → "오후 7:30" */
export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const meridiem = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${meridiem} ${hour12}:${pad(m)}` : `${meridiem} ${hour12}시`;
}

/** 일정의 시간 범위를 사람이 읽는 문장으로 */
export function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
): string {
  const start = formatTime(startTime);
  if (!start) return "종일";
  const end = formatTime(endTime);
  return end ? `${start} ~ ${end}` : start;
}

/** timestamptz → "2026년 10월 11일 오후 7:30" (한국 시간) */
export function formatTimestamp(iso: string): string {
  return timestampFormatter.format(new Date(iso));
}

/** 오늘로부터 며칠 뒤인지 ("오늘", "내일", "3일 후") */
export function describeDistance(key: string, from = todayKey()): string {
  const diff = Math.round(
    (Date.parse(`${key}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  if (diff > 0) return `${diff}일 후`;
  if (diff === -1) return "어제";
  return `${Math.abs(diff)}일 전`;
}
