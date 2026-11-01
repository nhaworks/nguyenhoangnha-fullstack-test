import { AlertIcon, DocumentIcon, SpinnerIcon } from './icons';

type StatusViewProps = {
  type: 'loading' | 'error' | 'empty';
  title: string;
  description?: string | null;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatusView({ type, title, description, actionLabel, onAction }: StatusViewProps) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
    >
      {type === 'loading' && <SpinnerIcon className="size-8 text-violet-600" />}
      {type === 'error' && <AlertIcon className="size-10 text-red-500" />}
      {type === 'empty' && <DocumentIcon className="size-10 text-slate-400" />}

      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
