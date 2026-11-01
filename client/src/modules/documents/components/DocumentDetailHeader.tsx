import { DownloadButton, EditorBackButton } from './EditorTitleBar';

type DocumentDetailHeaderProps = {
  title: string;
  onTitleChange: (title: string) => void;
  fileTypeLabel: string;
  onBack: () => void;
  onDownload: () => void;
};

export function DocumentDetailHeader(props: DocumentDetailHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 md:px-3">
      <EditorBackButton onBack={props.onBack} />
      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-700">{props.fileTypeLabel}</span>
      <input
        value={props.title}
        onChange={(event) => props.onTitleChange(event.target.value)}
        maxLength={200}
        aria-label="Tên tài liệu"
        title={props.title}
        className="min-w-0 flex-1 truncate rounded-md px-1.5 py-1 text-sm font-semibold text-slate-900 outline-none hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-violet-300"
      />
      <DownloadButton onDownload={props.onDownload} />
    </header>
  );
}
