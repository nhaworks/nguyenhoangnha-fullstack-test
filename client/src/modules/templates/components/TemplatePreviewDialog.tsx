import type { TemplateSummary } from '../api/template.types';
import { useDialog } from '../../../shared/hooks/useDialog';
import { useTemplatePreview } from '../hooks/useTemplatePreview';
import { CloseIcon, PlusIcon, SpinnerIcon } from '../../../shared/components/icons';
import { ImageCarousel } from '../../../shared/components/ImageCarousel';
import { StatusView } from '../../../shared/components/StatusView';

type TemplatePreviewDialogProps = {
  templateId: string;
  onClose: () => void;
  onCreate: (template: TemplateSummary) => void;
};

export function TemplatePreviewDialog({ templateId, onClose, onCreate }: TemplatePreviewDialogProps) {
  const preview = useTemplatePreview(templateId);
  const { dialogRef, handleBackdropClick } = useDialog(preview.isOpen, onClose);
  const template = preview.template;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-label={template ? `Xem trước mẫu ${template.name}` : 'Xem trước mẫu'}
      className="m-auto h-[90vh] max-h-none w-[min(1200px,95vw)] max-w-none overflow-hidden rounded-2xl bg-white p-0 shadow-2xl outline-none backdrop:bg-slate-900/70"
    >
      {preview.status === 'loading' && (
        <div className="flex h-full items-center justify-center text-violet-600">
          <SpinnerIcon className="size-10" />
        </div>
      )}

      {preview.status === 'error' && (
        <div className="flex h-full items-center justify-center p-6">
          <StatusView
            type="error"
            title="Không tải được mẫu"
            description={preview.error}
            actionLabel="Thử lại"
            onAction={preview.reload}
          />
        </div>
      )}

      {preview.status === 'ready' && template && (
        <div className="grid h-full grid-rows-[3fr_2fr] md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-1">
          <ImageCarousel
            images={preview.previews}
            activeIndex={preview.activeIndex}
            activeImage={preview.activePreview}
            hasMultipleImages={preview.hasMultipleImages}
            positionText={preview.positionText}
            imageAlt={template.name}
            thumbnailListRef={preview.thumbnailListRef}
            onPrevious={preview.showPrevious}
            onNext={preview.showNext}
            onSelect={preview.showImage}
          />

          <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-t border-slate-200 p-6 md:border-l md:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{template.typeLabel}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{template.name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{template.description}</p>

            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              <InfoRow label="Danh mục" value={template.category.name} />
              <InfoRow label="Loại" value={template.typeLabel} />
              <InfoRow label="Xem trước" value={template.pageCountText} />
              <InfoRow label="Cập nhật" value={template.updatedAtText} />
            </dl>

            <div className="mt-auto space-y-2">
              <button
                type="button"
                onClick={() => onCreate(template)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
              >
                Dùng mẫu
              </button>
             
            </div>
          </aside>
        </div>
      )}
    </dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
