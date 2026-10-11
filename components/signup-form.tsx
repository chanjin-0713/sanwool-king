"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { emptyFormState } from "@/lib/errors";

export function SignupForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signUpAction, emptyFormState);

  if (state.message) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <p className="text-ko text-sm leading-relaxed text-ink-soft">
          메일이 보이지 않으면 스팸함도 확인해 주세요. 인증을 마치면 바로
          로그인할 수 있습니다.
        </p>
        <Link href="/login" className="btn-ghost w-full">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label className="label" htmlFor="name">
          이름
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={20}
          placeholder="홍길동"
          className="field"
        />
        <p className="mt-1.5 text-xs text-ink-faint">
          공지·사진에 작성자로 표시되는 이름입니다.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="email">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="sanwool@example.com"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="field"
        />
        <p className="mt-1.5 text-xs text-ink-faint">6자 이상</p>
      </div>

      <div>
        <label className="label" htmlFor="passwordConfirm">
          비밀번호 확인
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="field"
        />
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton className="btn-primary w-full" pendingLabel="가입 중…">
        가입하기
      </SubmitButton>

      <p className="pt-2 text-center text-sm text-ink-soft">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand hover:text-brand-dark"
        >
          로그인
        </Link>
      </p>
    </form>
  );
}
