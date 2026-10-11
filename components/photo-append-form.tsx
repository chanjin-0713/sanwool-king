"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { addPhotosAction } from "@/app/gallery/actions";
import { Alert } from "@/components/ui";
import { formatFileSize } from "@/lib/storage";
import { uploadPhotoFiles, validatePhotoFiles } from "@/lib/upload-photos";

/** 이미 만들어진 앨범에 사진을 더 올립니다. */
export function PhotoAppendForm({ albumId }: { albumId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const invalid = validatePhotoFiles(files);
    if (invalid) return setError(invalid);

    setBusy(true);
    setProgress({ done: 0, total: files.length });

    try {
      const outcome = await uploadPhotoFiles(albumId, files, (done, total) =>
        setProgress({ done, total }),
      );

      if (outcome.photos.length === 0) {
        setError(
          `사진을 올리지 못했습니다. ${outcome.failed[0] ?? "다시 시도해 주세요."}`,
        );
        return;
      }

      const registered = await addPhotosAction(albumId, outcome.photos);
      if (registered.error) {
        setError(registered.error);
        return;
      }

      setNotice(
        `${outcome.photos.length}장을 추가했습니다.${
          outcome.failed.length > 0
            ? ` (${outcome.failed.length}장 실패)`
            : ""
        }`,
      );
      formRef.current?.reset();
      setFiles([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="more-photos">
          사진 추가
        </label>
        <input
          id="more-photos"
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          className="field file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-dark"
        />
        <p className="mt-1.5 text-xs text-ink-faint">
          한 번에 최대 60장, 한 장당 25MB 이하
          {files.length > 0
            ? ` · 선택 ${files.length}장 (${formatFileSize(totalSize)})`
            : ""}
        </p>
      </div>

      {busy && progress.total > 0 ? (
        <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{
              width: `${Math.round((progress.done / progress.total) * 100)}%`,
            }}
          />
        </div>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <button type="submit" className="btn-ghost" disabled={busy}>
        {busy
          ? `올리는 중… ${progress.done}/${progress.total}`
          : "선택한 사진 추가하기"}
      </button>
    </form>
  );
}
