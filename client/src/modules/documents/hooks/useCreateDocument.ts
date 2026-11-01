import { useEffect, useState } from 'react';
import type { ToastMessage } from '../../../shared/components/Toast';
import { createDocument, documentPath, type SourceTemplate } from '../application/document.application';

const TOAST_DURATION_MS = 5000;

type Options = {
  onStart?: () => void;
};

export function useCreateDocument(options: Options = {}) {
  const [creatingTemplateId, setCreatingTemplateId] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  async function createFromTemplate(template: SourceTemplate) {
    options.onStart?.();
    setCreatingTemplateId(template.id);
    try {
      const document = await createDocument(template);
      setToast({
        type: 'success',
        text: `Đã tạo tài liệu "${document.title}"`,
        linkLabel: 'Mở tài liệu',
        linkUrl: documentPath(document.id),
      });
    } catch (error) {
      setToast({ type: 'error', text: (error as Error).message });
    } finally {
      setCreatingTemplateId('');
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return {
    creatingTemplateId,
    toast,
    createFromTemplate,
    closeToast() {
      setToast(null);
    },
  };
}
