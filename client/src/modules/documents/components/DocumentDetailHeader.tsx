import { EditorActions, EditorBackButton } from './EditorTitleBar';

type DocumentDetailHeaderProps = {
  title: string;
  fileTypeLabel: string;
  statusText: string;
  statusHint: string;
  onBack: () => void;
  onDownload: () => void;
};

export function DocumentDetailHeader(props: DocumentDetailHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 md:px-3">
      <EditorBackButton onBack={props.onBack} />
      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-700">{props.fileTypeLabel}</span>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900" title={props.title}>
        {props.title}
      </h1>
      <EditorActions statusText={props.statusText} statusHint={props.statusHint} onDownload={props.onDownload} />
    </header>
  );
}
