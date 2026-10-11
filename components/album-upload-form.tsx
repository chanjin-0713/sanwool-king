"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addPhotosAction, createAlbumAction } from "@/app/gallery/actions";
import { Alert } from "@/components/ui";
import { todayKey } from "@/lib/date";
import { formatFileSize } from "@/lib/storage";
import { uploadPhotoFiles, validatePhotoFiles } from "@/lib/upload-photos";

export function AlbumUploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWarning(null);

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const eventDate = String(form.get("event_date") ?? "");
    const description = String(form.get("description") ?? "");

    if (!title) return setError("앨범 제목을 입력해 주세요.");
    if (!eventDate) return setError("사진을 찍은 날짜를 선택해 주세요.");

    const invalid = validatePhotoFiles(files);
    if (invalid) return setError(invalid);

    setBusy(true);
    setProgress({ done: 0, total: files.length });

    try {
      const created = await createAlbumAction({ title, description, eventDate });
      if (created.error || !created.albumId) {
        setError(created.error ?? "앨범을 만들지 못했습니다.");
        return;
      }

      const outcome = await uploadPhotoFiles(created.albumId, files, (done, total) =>
        setProgress({ done, total }),
      );

      if (outcome.photos.length === 0) {
        setError(
          `사진을 올리지 못했습니다. ${outcome.failed[0] ?? "잠시 후 다시 시도해 주세요."}`,
        );
        return;
      }

      const registered = await addPhotosAction(created.albumId, outcome.photos);
      if (registered.error) {
        setError(registered.error);
        return;
      }

      if (outcome.failed.length > 0) {
        setWarning(
          `${outcome.failed.length}장은 올리지 못했습니다: ${outcome.failed.join(", ")}`,
        );
      }

      router.push(`/gallery/${created.albumId}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "업로드 중 문제가 발생했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">
            앨범 제목
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="예) 가을 수련회 2박 3일"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="event_date">
            사진 찍은 날
          </label>
          <input
            id="event_date"
            name="event_date"
            type="date"
            required
            defaultValue={todayKey()}
            className="field"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            이 날짜로 연·월 분류와 달력 연동이 됩니다.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="description">
            설명 <span className="font-normal text-ink-faint">(선택)</span>
          </label>
          <input
            id="description"
            name="description"
            type="text"
            maxLength={300}
            placeholder="어떤 모임이었는지 한 줄로"
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="photos">
            사진 (여러 장 선택 가능)
          </label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            required
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []))
            }
            className="field file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-dark"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            한 번에 최대 60장, 한 장당 25MB 이하
            {files.length > 0
              ? ` · 선택 ${files.length}장 (${formatFileSize(totalSize)})`
              : ""}
          </p>
        </div>
      </div>

      {busy && progress.total > 0 ? (
        <div>
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-soft">
            <span>사진 올리는 중…</span>
            <span>
              {progress.done} / {progress.total}장
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{
                width: `${Math.round((progress.done / progress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}
      {warning ? <Alert tone="info">{warning}</Alert> : null}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "올리는 중…" : "사진첩에 올리기"}
      </button>
    </form>
  );
}
