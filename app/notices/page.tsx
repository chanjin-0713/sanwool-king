import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatDateKey, timestampToDateKey } from "@/lib/date";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { rows, type Notice } from "@/lib/types";

export const metadata: Metadata = { title: "공지사항" };

function excerpt(text: string, length = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

export default async function NoticesPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data } = await supabase
    .from("notices")
    .select("id, title, content, is_pinned, created_at, author:profiles(name)")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const notices = rows<Notice>(data);

  return (
    <div>
      <PageHeader
        eyebrow="Notices"
        title="공지사항"
        description="수련회·모임 변경·신청 안내 등 청년부 소식을 올리는 곳입니다."
        action={
          user ? (
            <Link href="/notices/new" className="btn-primary">
              공지 올리기
            </Link>
          ) : (
            <Link href="/login?next=%2Fnotices%2Fnew" className="btn-ghost">
              로그인하고 글쓰기
            </Link>
          )
        }
      />

      {notices.length === 0 ? (
        <EmptyState
          title="아직 올라온 공지가 없습니다"
          description="첫 공지를 올려 청년부 식구들에게 소식을 전해보세요."
          action={
            user ? (
              <Link href="/notices/new" className="btn-primary">
                공지 올리기
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`/notices/${notice.id}`}
                className="card group block px-5 py-5 transition-colors hover:border-brand/40 hover:bg-surface-soft/60 sm:px-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {notice.is_pinned ? (
                    <span className="chip bg-brand-soft text-brand-dark">
                      📌 고정
                    </span>
                  ) : null}
                  <h2 className="text-ko text-base font-bold text-ink group-hover:text-brand-dark sm:text-lg">
                    {notice.title}
                  </h2>
                </div>
                <p className="text-ko mt-2 text-sm leading-relaxed text-ink-soft">
                  {excerpt(notice.content)}
                </p>
                <p className="mt-3 text-xs text-ink-faint">
                  {notice.author?.name ?? "청년부"} ·{" "}
                  {formatDateKey(timestampToDateKey(notice.created_at), "dot")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
