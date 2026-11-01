import { DocumentIcon } from './icons';

const IMAGE_FIT: Record<string, string> = {
  docx: 'object-cover object-top',
  pptx: 'object-contain',
};

type ThumbnailProps = {
  url: string | null;
  alt: string;
  docType: string;
};

export function Thumbnail({ url, alt, docType }: ThumbnailProps) {
  if (!url) {
    return (
      <div className="flex size-full items-center justify-center text-slate-400">
        <DocumentIcon className="size-12" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`size-full rounded-md bg-white shadow-sm ${IMAGE_FIT[docType] || 'object-contain'}`}
    />
  );
}
