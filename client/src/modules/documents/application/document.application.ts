import {
  createDocumentFromTemplate,
  getDocument,
  getDocumentFile,
  getDocuments,
  KEEPALIVE_MAX_BYTES,
  saveDocumentFile,
  saveDocumentFileOnExit,
} from '../api/document.api';
import type { DocumentInfo, DocumentListItem } from '../api/document.types';

export const DOCUMENT_LIST_PATH = '/documents';

export type DocumentTypeTab = {
  type: string;
  label: string;
  emptyTitle: string;
};

export const DOCUMENT_TYPE_TABS: DocumentTypeTab[] = [
  { type: 'docx', label: 'Tài liệu', emptyTitle: 'Chưa có tài liệu nào' },
  { type: 'pptx', label: 'Trình chiếu', emptyTitle: 'Chưa có bản trình chiếu nào' },
];

export function findDocumentTypeTab(type: string): DocumentTypeTab {
  return DOCUMENT_TYPE_TABS.find((tab) => tab.type === type) || DOCUMENT_TYPE_TABS[0];
}

export function readDocumentTypeFromUrl(search: string): string {
  const type = new URLSearchParams(search).get('type') || '';
  return findDocumentTypeTab(type).type;
}

export function documentListUrl(type: string): string {
  return `${DOCUMENT_LIST_PATH}?type=${encodeURIComponent(type)}`;
}

export function filterDocumentsByType<T extends DocumentInfo>(documents: T[], type: string): T[] {
  return documents.filter((document) => document.type === type);
}

export type SourceTemplate = {
  id: string;
  name: string;
};

type DisplayFields = {
  fileTypeLabel: string;
  statusText: string;
  openLabel: string;
};

export type DocumentView = DocumentInfo & DisplayFields;
export type DocumentCardView = DocumentListItem & DisplayFields;

export type OpenedDocument = {
  document: DocumentView;
  fileContent: ArrayBuffer | null;
};

export function documentPath(id: string): string {
  return `${DOCUMENT_LIST_PATH}/${encodeURIComponent(id)}`;
}

export function getDocumentIdFromPath(path: string): string {
  const match = path.match(/^\/documents\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function createDocument(template: SourceTemplate): Promise<DocumentInfo> {
  return createDocumentFromTemplate(template.id, template.name);
}

export async function loadDocuments(): Promise<DocumentCardView[]> {
  const documents = await getDocuments();
  return documents.map(addDisplayFields);
}

export async function loadOpenedDocument(id: string): Promise<OpenedDocument> {
  const document = await getDocument(id);
  const fileContent = document.editable ? await getDocumentFile(id) : null;
  return { document: addDisplayFields(document), fileContent };
}

export async function saveEditedDocument(id: string, content: ArrayBuffer): Promise<DocumentView> {
  const document = await saveDocumentFile(id, content);
  return addDisplayFields(document);
}

export function saveDocumentOnExit(id: string, content: ArrayBuffer): boolean {
  if (content.byteLength > KEEPALIVE_MAX_BYTES) return false;
  saveDocumentFileOnExit(id, content);
  return true;
}

function addDisplayFields<T extends DocumentInfo>(document: T): T & DisplayFields {
  return {
    ...document,
    fileTypeLabel: document.type.toUpperCase(),
    statusText: buildStatusText(document),
    openLabel: document.editable ? 'Chỉnh sửa' : 'Xem',
  };
}

function buildStatusText(document: DocumentInfo): string {
  if (document.updatedAt === document.createdAt) {
    return `Chưa chỉnh sửa · tạo lúc ${formatDateTime(document.createdAt)}`;
  }
  return `Cập nhật lúc ${formatDateTime(document.updatedAt)}`;
}

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
