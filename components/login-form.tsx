"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { emptyFormState } from "@/lib/errors";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInAction, emptyFormState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton className="btn-primary w-full" pendingLabel="로그인 중…">
        로그인
      </SubmitButton>

      <p className="pt-2 text-center text-sm text-ink-soft">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand hover:text-brand-dark"
        >
          회원가입
        </Link>
      </p>
    </form>
  );
}
