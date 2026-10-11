"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createNoticeAction } from "@/app/notices/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { emptyFormState } from "@/lib/errors";

export function NoticeForm({ canPin }: { canPin: boolean }) {
  const [state, formAction] = useActionState(createNoticeAction, emptyFormState);

  return (
    <form action={formAction} className="card space-y-5 px-6 py-7 sm:px-8">
      <div>
        <label className="label" htmlFor="title">
          제목
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          placeholder="예) 10월 청년부 수련회 신청 안내"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="content">
          내용
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={12}
          placeholder={
            "공지 내용을 적어주세요.\n\n줄바꿈은 그대로 보입니다."
          }
          className="field resize-y leading-relaxed"
        />
      </div>

      {canPin ? (
        <label className="flex items-start gap-3 rounded-xl bg-surface-soft px-4 py-3">
          <input
            type="checkbox"
            name="is_pinned"
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
          />
          <span className="text-sm text-ink-soft">
            <strong className="font-semibold text-ink">목록 맨 위에 고정</strong>
            <br />
            꼭 봐야 하는 공지일 때만 사용해 주세요.
          </span>
        </label>
      ) : null}

      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton pendingLabel="올리는 중…">공지 올리기</SubmitButton>
        <Link href="/notices" className="btn-ghost">
          취소
        </Link>
      </div>
    </form>
  );
}
