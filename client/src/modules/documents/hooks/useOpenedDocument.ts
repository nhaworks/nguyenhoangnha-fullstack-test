import { useEffect, useRef, useState } from 'react';
import type { DocxEditorRef } from '@docx-editor.dev/react';
import type { ToastMessage } from '../../../shared/components/Toast';
import { useAsyncData } from '../../../shared/hooks/useAsyncData';
import {
  loadOpenedDocument,
  saveDocumentOnExit,
  saveEditedDocument,
  type DocumentView,
} from '../application/document.application';

export type OpenedDocumentStatus = 'loading' | 'error' | 'ready';

const AUTOSAVE_DELAY_MS = 2000;
const SNAPSHOT_DELAY_MS = 400;
const TOAST_DURATION_MS = 4000;
const LEAVE_CONFIRM_MESSAGE = 'Không lưu được tài liệu. Vẫn rời khỏi trang?';

export function useOpenedDocument(documentId: string, onLeave: (type: string) => void) {
  const opened = useAsyncData(() => loadOpenedDocument(documentId), [documentId]);
  const editorRef = useRef<DocxEditorRef>(null);
  const editVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const pendingSaveRef = useRef<Promise<boolean> | null>(null);
  const snapshotRef = useRef<{ version: number; content: ArrayBuffer } | null>(null);
  const [editVersion, setEditVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDocument, setSavedDocument] = useState<DocumentView | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const openedDocument = savedDocument || (opened.data ? opened.data.document : null);
  const hasUnsavedChanges = editVersion !== savedVersion;

  function hasPendingChanges() {
    return editVersionRef.current !== savedVersionRef.current || pendingSaveRef.current !== null;
  }

  function handleEditorChange(change: { source?: string }) {
    if (change.source) return;
    editVersionRef.current += 1;
    setEditVersion(editVersionRef.current);
  }

  async function runSave(): Promise<boolean> {
    const versionAtSave = editVersionRef.current;
    setIsSaving(true);
    try {
      const content = await editorRef.current?.save();
      if (!content) return false;
      const updatedDocument = await saveEditedDocument(documentId, content);
      savedVersionRef.current = versionAtSave;
      setSavedVersion(versionAtSave);
      setSavedDocument(updatedDocument);
      return true;
    } catch (error) {
      setToast({ type: 'error', text: `Không lưu được: ${(error as Error).message}` });
      return false;
    } finally {
      pendingSaveRef.current = null;
      setIsSaving(false);
    }
  }

  function save(): Promise<boolean> {
    if (pendingSaveRef.current) return pendingSaveRef.current;
    if (editVersionRef.current === savedVersionRef.current) return Promise.resolve(true);
    pendingSaveRef.current = runSave();
    return pendingSaveRef.current;
  }

  async function saveAll(): Promise<boolean> {
    if (pendingSaveRef.current) await pendingSaveRef.current;
    return save();
  }


  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [editVersion, savedVersion, isSaving]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = setTimeout(async () => {
      const version = editVersionRef.current;
      const content = await editorRef.current?.save();
      if (content) snapshotRef.current = { version, content };
    }, SNAPSHOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [editVersion]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasPendingChanges()) return;

      const snapshot = snapshotRef.current;
      const snapshotIsNewer = snapshot !== null && snapshot.version > savedVersionRef.current;
      const sent = snapshotIsNewer && saveDocumentOnExit(documentId, snapshot.content);
      const everythingSent = sent && snapshot.version === editVersionRef.current;
      if (!everythingSent) event.preventDefault();
    }
    function handleVisibilityChange() {
      if (window.document.visibilityState === 'hidden' && hasPendingChanges()) void saveAll();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [documentId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  async function download() {
    if (!openedDocument) return;
    const saved = await saveAll();
    if (!saved) return;
    window.location.assign(openedDocument.downloadUrl);
  }

  async function leave() {
    const saved = await saveAll();
    if (!saved && !window.confirm(LEAVE_CONFIRM_MESSAGE)) return;
    onLeave(openedDocument ? openedDocument.type : '');
  }

  let status: OpenedDocumentStatus = 'ready';
  if (opened.error) status = 'error';
  else if (!openedDocument) status = 'loading';

  let saveLabel = 'Đã lưu';
  if (isSaving) saveLabel = 'Đang lưu…';
  else if (hasUnsavedChanges) saveLabel = 'Lưu';

  return {
    status,
    error: opened.error,
    reload: opened.reload,
    document: openedDocument,
    fileContent: opened.data ? opened.data.fileContent : null,
    editorRef,
    saveLabel,
    canSave: hasUnsavedChanges && !isSaving,
    handleEditorChange,
    save() {
      void save();
    },
    download,
    leave,
    toast,
    closeToast() {
      setToast(null);
    },
  };
}
