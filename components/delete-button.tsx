"use client";

import { useFormStatus } from "react-dom";

function Inner({
  label,
  pendingLabel,
  confirmText,
  className,
}: {
  label: string;
  pendingLabel: string;
  confirmText: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * 삭제·고정 같은 한 번 누르면 끝나는 동작용. 서버 액션을 그대로 받아
 * 숨은 입력값과 함께 제출합니다.
 */
export function ActionButton({
  action,
  values,
  label,
  pendingLabel = "처리 중…",
  confirmText,
  className = "btn-danger",
}: {
  action: (formData: FormData) => Promise<void>;
  values: Record<string, string>;
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  className?: string;
}) {
  return (
    <form action={action} className="contents">
      {Object.entries(values).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {confirmText ? (
        <Inner
          label={label}
          pendingLabel={pendingLabel}
          confirmText={confirmText}
          className={className}
        />
      ) : (
        <PlainSubmit
          label={label}
          pendingLabel={pendingLabel}
          className={className}
        />
      )}
    </form>
  );
}

function PlainSubmit({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
