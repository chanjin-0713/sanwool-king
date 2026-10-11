import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteNoticeAction, toggleNoticePinAction } from "@/app/notices/actions";
import { ActionButton } from "@/components/delete-button";
import { SetupNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/date";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { firstRow, type Notice } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function loadNotice(id: string): Promise<Notice | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notices")
    .select("*, author:profiles(name)")
    .eq("id", id)
    .limit(1);
  return firstRow<Notice>(data);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isSupabaseConfigured) return { title: "공지사항" };
  const { id } = await params;
  const notice = await loadNotice(id);
  return { title: notice?.title ?? "공지사항" };
}

export default async function NoticeDetailPage({ params }: Params) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { id } = await params;
  const [notice, user] = await Promise.all([loadNotice(id), getCurrentUser()]);
  if (!notice) notFound();

  const canManage =
    !!user && (user.id === notice.author_id || user.role === "admin");

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/notices"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand"
      >
        ← 공지사항 목록
      </Link>

      <header className="border-b border-line pb-6">
        {notice.is_pinned ? (
          <span className="chip mb-3 bg-brand-soft text-brand-dark">📌 고정 공지</span>
        ) : null}
        <h1 className="text-ko font-display text-3xl leading-snug text-ink sm:text-4xl">
          {notice.title}
        </h1>
        <p className="mt-4 text-sm text-ink-faint">
          {notice.author?.name ?? "청년부"} · {formatTimestamp(notice.created_at)}
          {notice.updated_at !== notice.created_at
            ? ` · 수정 ${formatTimestamp(notice.updated_at)}`
            : ""}
        </p>
      </header>

      <div className="text-ko whitespace-pre-wrap py-8 text-[15px] leading-[1.9] text-ink">
        {notice.content}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
          {user?.role === "admin" ? (
            <ActionButton
              action={toggleNoticePinAction}
              values={{ id: notice.id, pinned: String(notice.is_pinned) }}
              label={notice.is_pinned ? "고정 해제" : "맨 위에 고정"}
              pendingLabel="변경 중…"
              className="btn-ghost px-4 py-1.5 text-xs"
            />
          ) : null}
          <ActionButton
            action={deleteNoticeAction}
            values={{ id: notice.id }}
            label="삭제"
            pendingLabel="삭제 중…"
            confirmText="이 공지를 삭제할까요? 되돌릴 수 없습니다."
          />
        </div>
      ) : null}
    </article>
  );
}
