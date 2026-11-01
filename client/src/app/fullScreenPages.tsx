import type { ReactElement } from 'react';
import { DocumentDetailPage } from '../modules/documents/pages/DocumentDetailPage';

type FullScreenPage = {
  pattern: RegExp;
  page: ReactElement;
};

const FULL_SCREEN_PAGES: FullScreenPage[] = [{ pattern: /^\/documents\/[^/]+$/, page: <DocumentDetailPage /> }];

export function findFullScreenPage(path: string): ReactElement | null {
  const match = FULL_SCREEN_PAGES.find((item) => item.pattern.test(path));
  return match ? match.page : null;
}
