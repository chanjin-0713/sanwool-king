/**
 * Supabase 클라이언트에 생성된 Database 타입을 물려주지 않았으므로
 * 조회 결과는 느슨하게 추론됩니다 (특히 조인한 author 가 배열로 추론됨).
 * 실제 응답 모양은 아래 인터페이스와 같으니 이 두 헬퍼로 한 번만 맞춰 씁니다.
 */
export function rows<T>(data: unknown): T[] {
  return (data ?? []) as T[];
}

export function firstRow<T>(data: unknown): T | null {
  return ((data ?? []) as T[])[0] ?? null;
}

export type Role = "member" | "admin";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

/** 조회 결과에 조인된 작성자 정보 */
export type AuthorRef = { name: string } | null;

export interface Notice {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: AuthorRef;
}

export type BulletinKind = "bulletin" | "ad";

export interface Bulletin {
  id: string;
  title: string;
  kind: BulletinKind;
  description: string | null;
  issued_on: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  author_id: string;
  created_at: string;
  author?: AuthorRef;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  /** 사진을 찍은 날 (YYYY-MM-DD). 연/월 분류와 달력 연동의 기준 */
  event_date: string;
  cover_path: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: AuthorRef;
}

export interface Photo {
  id: string;
  album_id: string;
  storage_path: string;
  file_name: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  uploaded_by: string;
  /** 업로드한 날짜와 시간 (ISO 8601) */
  uploaded_at: string;
}

/** 사진첩 목록용: 앨범 + 사진 수 + 대표 이미지 */
export interface AlbumSummary extends Album {
  photoCount: number;
  coverUrl: string | null;
}

export type EventCategory =
  | "worship"
  | "meeting"
  | "fellowship"
  | "retreat"
  | "service"
  | "etc";

export interface YouthEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: AuthorRef;
}

export const EVENT_CATEGORIES: Record<
  EventCategory,
  { label: string; dot: string; chip: string }
> = {
  worship: {
    label: "예배",
    dot: "bg-brand",
    chip: "bg-brand-soft text-brand-dark",
  },
  meeting: {
    label: "모임",
    dot: "bg-sage",
    chip: "bg-sage-soft text-sage",
  },
  fellowship: {
    label: "친교",
    dot: "bg-gold",
    chip: "bg-gold-soft text-gold",
  },
  retreat: {
    label: "수련회",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700",
  },
  service: {
    label: "봉사",
    dot: "bg-teal-600",
    chip: "bg-teal-50 text-teal-700",
  },
  etc: {
    label: "기타",
    dot: "bg-ink-faint",
    chip: "bg-surface-soft text-ink-soft",
  },
};

export const BULLETIN_KINDS: Record<
  BulletinKind,
  { label: string; chip: string }
> = {
  bulletin: { label: "주보", chip: "bg-brand-soft text-brand-dark" },
  ad: { label: "광고", chip: "bg-sage-soft text-sage" },
};
