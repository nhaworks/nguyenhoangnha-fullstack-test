import { ArrowLeftIcon, DownloadIcon } from '../../../shared/components/icons';

export function EditorBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Quay lại danh sách tài liệu"
      title="Quay lại danh sách tài liệu"
      className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <ArrowLeftIcon className="size-5" />
    </button>
  );
}

export function DownloadButton({ onDownload }: { onDownload: () => void }) {
  return (
    <button
      type="button"
      onClick={onDownload}
      aria-label="Tải xuống"
      title="Tải xuống"
      className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
    >
      <DownloadIcon className="size-4" />
      <span className="max-lg:hidden">Tải xuống</span>
    </button>
  );
}
