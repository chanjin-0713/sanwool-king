import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="font-display text-3xl text-ink">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-ko mt-3 text-sm leading-relaxed text-ink-soft">
        주소가 바뀌었거나 삭제된 글일 수 있어요.
      </p>
      <Link href="/" className="btn-primary mt-7">
        홈으로 가기
      </Link>
    </div>
  );
}
