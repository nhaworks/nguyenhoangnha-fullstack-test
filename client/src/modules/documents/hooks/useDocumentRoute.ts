import { useCurrentPath } from '../../../shared/hooks/useCurrentPath';
import { navigateTo } from '../../../shared/navigation';
import { documentListUrl, documentPath, getDocumentIdFromPath } from '../application/document.application';

export function useDocumentRoute() {
  const path = useCurrentPath();

  return {
    documentId: getDocumentIdFromPath(path),
    openDocument(id: string) {
      navigateTo(documentPath(id));
    },
    backToList(type: string) {
      navigateTo(documentListUrl(type));
    },
  };
}
