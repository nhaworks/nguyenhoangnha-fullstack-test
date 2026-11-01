import type { Ref } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

export type CarouselImage = {
  position: number;
  url: string;
};

type ImageCarouselProps = {
  images: CarouselImage[];
  activeIndex: number;
  activeImage: CarouselImage | null;
  hasMultipleImages: boolean;
  positionText: string;
  imageAlt: string;
  thumbnailListRef: Ref<HTMLDivElement>;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
};

export function ImageCarousel(props: ImageCarouselProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 py-6">
        {props.activeImage && (
          <img
            src={props.activeImage.url}
            alt={`${props.imageAlt} - ảnh ${props.activeIndex + 1}`}
            className="max-h-full max-w-full rounded-md bg-white object-contain shadow-lg"
          />
        )}

        {props.hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={props.onPrevious}
              aria-label="Ảnh trước"
              className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-900"
            >
              <ChevronLeftIcon className="size-6" />
            </button>
            <button
              type="button"
              onClick={props.onNext}
              aria-label="Ảnh tiếp theo"
              className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-900"
            >
              <ChevronRightIcon className="size-6" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white">
              {props.positionText}
            </span>
          </>
        )}
      </div>

      <div ref={props.thumbnailListRef} className="flex shrink-0 gap-3 overflow-x-auto border-t border-slate-200 bg-white p-4">
        {props.images.map((image, index) => {
          const isActive = index === props.activeIndex;
          return (
            <button
              key={image.position}
              type="button"
              onClick={() => props.onSelect(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={isActive}
              className={`shrink-0 overflow-hidden rounded-md border-2 bg-slate-50 transition ${
                isActive ? 'border-violet-600' : 'border-slate-200 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={image.url} alt="" className="h-20 w-auto" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
