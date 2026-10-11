import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-ko mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description ? (
          <p className="text-ko mt-1 text-sm text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-xl">
        🕊️
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {description ? (
        <p className="text-ko max-w-sm text-sm text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-line bg-surface-soft text-ink-soft",
    success: "border-sage/30 bg-sage-soft text-sage",
  } as const;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`text-ko rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

export function Chip({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <span className={`chip ${className}`}>{children}</span>;
}

/** .env.local 이 아직 비어 있을 때 보여주는 안내 */
export function SetupNotice() {
  return (
    <div className="card mx-auto max-w-2xl px-7 py-8">
      <p className="eyebrow mb-2">첫 설정이 필요합니다</p>
      <h2 className="font-display text-2xl text-ink">
        Supabase 연결 정보를 넣어주세요
      </h2>
      <ol className="text-ko mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
        <li>
          <strong className="text-ink">1.</strong> supabase.com 에서 프로젝트를
          새로 만듭니다 (무료 플랜으로 충분합니다).
        </li>
        <li>
          <strong className="text-ink">2.</strong> 프로젝트의{" "}
          <em>SQL Editor</em> 에 <code className="rounded bg-surface-soft px-1.5 py-0.5">supabase/schema.sql</code>{" "}
          내용을 붙여넣고 실행합니다.
        </li>
        <li>
          <strong className="text-ink">3.</strong> <em>Project Settings → API</em>{" "}
          의 URL 과 anon key 를 프로젝트 폴더의{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5">.env.local</code>{" "}
          에 적습니다.
          <pre className="mt-2 overflow-x-auto rounded-xl bg-ink px-4 py-3 text-xs leading-relaxed text-cream">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
          </pre>
        </li>
        <li>
          <strong className="text-ink">4.</strong> 개발 서버를 다시 시작하면
          홈페이지가 열립니다.
        </li>
      </ol>
    </div>
  );
}
