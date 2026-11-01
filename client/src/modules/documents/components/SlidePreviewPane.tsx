import { ImageCarousel } from '../../../shared/components/ImageCarousel';
import { SpinnerIcon } from '../../../shared/components/icons';
import { StatusView } from '../../../shared/components/StatusView';
import { useTemplatePreview } from '../../templates/hooks/useTemplatePreview';

type SlidePreviewPaneProps = {
  templateId: string;
  title: string;
};

export function SlidePreviewPane({ templateId, title }: SlidePreviewPaneProps) {
  const preview = useTemplatePreview(templateId);

  if (preview.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-violet-600">
        <SpinnerIcon className="size-10" />
      </div>
    );
  }

  if (preview.status === 'error') {
    return (
      <div className="p-6">
        <StatusView type="error" title="Không tải được ảnh slide" description={preview.error} actionLabel="Thử lại" onAction={preview.reload} />
      </div>
    );
  }

  return (
    <ImageCarousel
      images={preview.previews}
      activeIndex={preview.activeIndex}
      activeImage={preview.activePreview}
      hasMultipleImages={preview.hasMultipleImages}
      positionText={preview.positionText}
      imageAlt={title}
      thumbnailListRef={preview.thumbnailListRef}
      onPrevious={preview.showPrevious}
      onNext={preview.showNext}
      onSelect={preview.showImage}
    />
  );
}
