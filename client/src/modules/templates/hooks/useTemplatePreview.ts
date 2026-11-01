import { useEffect, useRef, useState } from 'react';
import { getNextIndex, getPreviousIndex } from '../application/carousel';
import { loadTemplateDetail } from '../application/template.application';
import { useAsyncData } from '../../../shared/hooks/useAsyncData';

export function useTemplatePreview(templateId: string) {
  const detail = useAsyncData(
    () => (templateId ? loadTemplateDetail(templateId) : Promise.resolve(null)),
    [templateId],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbnailListRef = useRef<HTMLDivElement>(null);

  const template = detail.data;
  const previews = template ? template.previews : [];
  const total = previews.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [templateId]);

  function showNext() {
    setActiveIndex((index) => getNextIndex(index, total));
  }

  function showPrevious() {
    setActiveIndex((index) => getPreviousIndex(index, total));
  }

  useEffect(() => {
    if (!templateId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') setActiveIndex((index) => getNextIndex(index, total));
      if (event.key === 'ArrowLeft') setActiveIndex((index) => getPreviousIndex(index, total));
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [templateId, total]);

  useEffect(() => {
    const activeThumbnail = thumbnailListRef.current?.children[activeIndex];
    activeThumbnail?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  let status: 'loading' | 'error' | 'ready' = 'ready';
  if (detail.error) status = 'error';
  else if (detail.isLoading || !template) status = 'loading';

  return {
    isOpen: templateId !== '',
    status,
    error: detail.error,
    reload: detail.reload,
    template,
    previews,
    activeIndex,
    activePreview: previews[activeIndex] || null,
    hasMultipleImages: total > 1,
    positionText: `${activeIndex + 1} / ${total}`,
    thumbnailListRef,
    showNext,
    showPrevious,
    showImage: setActiveIndex,
  };
}
