import type { ComponentType, ReactElement } from 'react';
import { DocumentListPage } from '../modules/documents/pages/DocumentListPage';
import { TemplateLibraryPage } from '../modules/templates/pages/TemplateLibraryPage';
import { DocumentIcon, FolderIcon, PresentationIcon } from '../shared/components/icons';

export type MenuItem = {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  page: ReactElement;
};

export const MENU_ITEMS: MenuItem[] = [
  { path: '/templates/docx', label: 'Mẫu tài liệu', icon: DocumentIcon, page: <TemplateLibraryPage docType="docx" /> },
  { path: '/templates/pptx', label: 'Mẫu trình chiếu', icon: PresentationIcon, page: <TemplateLibraryPage docType="pptx" /> },
  { path: '/documents', label: 'Quản lý tài liệu', icon: FolderIcon, page: <DocumentListPage /> },
];

export function findMenuItem(path: string): MenuItem {
  return MENU_ITEMS.find((item) => path === item.path || path.startsWith(item.path + '/')) || MENU_ITEMS[0];
}
