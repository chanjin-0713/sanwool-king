"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/delete-button";
import { formatTimestamp } from "@/lib/date";

export interface LightboxPhoto {
  id: string;
  url: string | null;
  fileName: string;
  uploadedAt: string;
  width: number | null;
  height: number | null;
}

/**
 * 썸네일 격자 + 전체 화면 보기.
 * 썸네일을 누르면 크게 열리고, 같이 올린 사진 전체를 좌우 화살표·키보드·
 * 아래 필름스트립으로 넘겨볼 수 있습니다.
 */
export function PhotoLightbox({
  photos,
  albumTitle,
  canManage,
  deleteAction,
}: {
  photos: LightboxPhoto[];
  albumTitle: string;
  canManage: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const total = photos.length;

  // 사진이 삭제되어 개수가 줄어도 범위를 벗어나지 않도록 렌더 시점에 보정합니다.
  const safeIndex =
    index === null || total === 0 ? null : Math.min(index, total - 1);
  const open = safeIndex !== null;

  const close = useCallback(() => setIndex(null), []);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (current === null || total === 0) return current;
        const base = Math.min(current, total - 1);
        return (base + delta + total) % total;
      });
    },
    [total],
  );

  useEffect(() => {
    if (!open) return;

    document.body.dataset.lightboxOpen = "true";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      delete document.body.dataset.lightboxOpen;
    };
  }, [open, close, go]);

  // 필름스트립에서 현재 사진이 보이도록 스크롤
  useEffect(() => {
    if (safeIndex === null) return;
    const strip = filmstripRef.current;
    const active = strip?.querySelector<HTMLElement>(
      `[data-strip-index="${safeIndex}"]`,
    );
    active?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [safeIndex]);

  const current = safeIndex === null ? null : photos[safeIndex];

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
        {photos.map((photo, position) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`${position + 1}번째 사진 크게 보기`}
              className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {photo.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo.url}
                  alt={`${albumTitle} ${position + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl text-ink-faint">
                  📷
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {open && current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${albumTitle} 사진 보기`}
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          {/* 상단 */}
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-cream sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{albumTitle}</p>
              <p className="truncate text-xs text-cream/60">
                {safeIndex + 1} / {total} · {current.fileName}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-cream transition-colors hover:bg-white/20"
            >
              닫기 ✕
            </button>
          </div>

          {/* 큰 사진 */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touchStartX.current;
              const end = event.changedTouches[0]?.clientX ?? null;
              touchStartX.current = null;
              if (start === null || end === null) return;
              const diff = end - start;
              if (Math.abs(diff) > 50) go(diff < 0 ? 1 : -1);
            }}
          >
            {current.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={current.url}
                alt={`${albumTitle} ${safeIndex + 1}`}
                width={current.width ?? undefined}
                height={current.height ?? undefined}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-cream/70">사진을 불러올 수 없습니다.</p>
            )}

            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="이전 사진"
                  className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-4 text-xl text-cream transition-colors hover:bg-white/25 sm:left-4"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="다음 사진"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-4 text-xl text-cream transition-colors hover:bg-white/25 sm:right-4"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>

          {/* 하단: 업로드 시각 + 필름스트립 */}
          <div className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-6">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-cream/70">
                업로드 {formatTimestamp(current.uploadedAt)}
              </p>
              <div className="flex items-center gap-2">
                {current.url ? (
                  <a
                    href={`${current.url}&download=${encodeURIComponent(current.fileName)}`}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-white/20"
                  >
                    원본 저장
                  </a>
                ) : null}
                {canManage ? (
                  <ActionButton
                    action={deleteAction}
                    values={{ id: current.id }}
                    label="이 사진 삭제"
                    pendingLabel="삭제 중…"
                    confirmText="이 사진을 삭제할까요?"
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/30"
                  />
                ) : null}
              </div>
            </div>

            {total > 1 ? (
              <div
                ref={filmstripRef}
                className="flex gap-2 overflow-x-auto pb-1"
                aria-label="같이 올린 사진들"
              >
                {photos.map((photo, position) => (
                  <button
                    key={photo.id}
                    type="button"
                    data-strip-index={position}
                    onClick={() => setIndex(position)}
                    aria-label={`${position + 1}번째 사진`}
                    aria-current={position === safeIndex}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity ${
                      position === safeIndex
                        ? "border-cream opacity-100"
                        : "border-transparent opacity-50 hover:opacity-90"
                    }`}
                  >
                    {photo.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
