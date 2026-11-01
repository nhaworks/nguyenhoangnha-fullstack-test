import { DownloadIcon, EyeIcon, PencilIcon } from '../../../shared/components/icons';
import { Thumbnail } from '../../../shared/components/Thumbnail';
import type { DocumentCardView } from '../application/document.application';

type DocumentCardProps = {
  document: DocumentCardView;
  onOpen: (documentId: string) => void;
};

export function DocumentCard({ document, onOpen }: DocumentCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-600/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 p-4">
        <Thumbnail url={document.thumbnailUrl} alt={`Ảnh của tài liệu ${document.title}`} docType={document.type} />

        <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-2 bg-slate-900/50 px-3 opacity-0 backdrop-blur-[1px] transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:items-end pointer-coarse:bg-transparent pointer-coarse:pb-3 pointer-coarse:opacity-100 pointer-coarse:backdrop-blur-none">
          <button
            type="button"
            onClick={() => onOpen(document.id)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-violet-500"
          >
            {document.editable ? <PencilIcon className="size-4" /> : <EyeIcon className="size-4" />}
            {document.openLabel}
          </button>
          <a
            href={document.downloadUrl}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow transition hover:bg-slate-100"
          >
            <DownloadIcon className="size-4" />
            Tải xuống
          </a>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-slate-100 p-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-violet-600">
          <span className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold">{document.fileTypeLabel}</span>
          <span className="truncate">Từ mẫu {document.templateName}</span>
        </span>
        <h3 className="line-clamp-1 font-semibold text-slate-900" title={document.title}>
          {document.title}
        </h3>
        <p className="text-sm text-slate-500">{document.statusText}</p>
      </div>
    </article>
  );
}
