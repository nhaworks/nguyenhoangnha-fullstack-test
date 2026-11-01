import { useEffect, useState } from 'react';
import { useAsyncData } from '../../../shared/hooks/useAsyncData';
import {
  DOCUMENT_TYPE_TABS,
  documentListUrl,
  filterDocumentsByType,
  findDocumentTypeTab,
  loadDocuments,
  readDocumentTypeFromUrl,
} from '../application/document.application';

export type DocumentListStatus = 'loading' | 'error' | 'empty' | 'ready';

export function useDocumentList() {
  const documents = useAsyncData(loadDocuments, []);
  const [activeType, setActiveType] = useState(() => readDocumentTypeFromUrl(window.location.search));

  useEffect(() => {
    function handleUrlChange() {
      setActiveType(readDocumentTypeFromUrl(window.location.search));
    }
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const allDocuments = documents.data || [];
  const visibleDocuments = filterDocumentsByType(allDocuments, activeType);

  const typeTabs = DOCUMENT_TYPE_TABS.map((tab) => ({
    value: tab.type,
    label: tab.label,
    count: filterDocumentsByType(allDocuments, tab.type).length,
  }));

  let status: DocumentListStatus = 'ready';
  if (documents.error) status = 'error';
  else if (documents.data === null) status = 'loading';
  else if (visibleDocuments.length === 0) status = 'empty';

  return {
    typeTabs,
    activeType,
    documents: visibleDocuments,
    status,
    emptyTitle: findDocumentTypeTab(activeType).emptyTitle,
    error: documents.error,
    reload: documents.reload,
    changeType(type: string) {
      window.history.pushState(null, '', documentListUrl(type));
      setActiveType(type);
    },
  };
}
