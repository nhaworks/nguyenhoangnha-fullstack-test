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

type EditorActionsProps = {
  statusText?: string;
  statusHint?: string;
  saveLabel?: string;
  canSave?: boolean;
  onSave?: () => void;
  onDownload: () => void;
};

export function EditorActions(props: EditorActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {props.statusText && (
        <span title={props.statusHint} className="max-w-64 truncate text-xs text-slate-500 max-md:hidden">
          {props.statusText}
        </span>
      )}
      {props.saveLabel && (
        <button
          type="button"
          onClick={props.onSave}
          disabled={!props.canSave}
          aria-live="polite"
          className="h-8 min-w-20 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-default disabled:bg-violet-100 disabled:text-violet-700"
        >
          {props.saveLabel}
        </button>
      )}
      <button
        type="button"
        onClick={props.onDownload}
        aria-label="Tải xuống"
        title="Tải xuống"
        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
      >
        <DownloadIcon className="size-4" />
        <span className="max-lg:hidden">Tải xuống</span>
      </button>
    </div>
  );
}
