import { CloseIcon } from './icons';

export type ToastMessage = {
  type: 'success' | 'error';
  text: string;
  linkLabel?: string;
  linkUrl?: string;
};

const TOAST_COLORS = {
  success: 'bg-slate-900 text-white',
  error: 'bg-red-600 text-white',
};

type ToastProps = {
  toast: ToastMessage | null;
  onClose: () => void;
};

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${TOAST_COLORS[toast.type]}`}
    >
      <p className="flex-1">{toast.text}</p>
      {toast.linkUrl && (
        <a href={toast.linkUrl} className="shrink-0 font-semibold underline underline-offset-2">
          {toast.linkLabel}
        </a>
      )}
      <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="shrink-0 opacity-70 hover:opacity-100">
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}
