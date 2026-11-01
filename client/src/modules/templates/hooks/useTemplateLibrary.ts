import { useEffect, useState } from 'react';
import { findDocType } from '../application/doc-types';
import {
  buildUrlSearch,
  clearSearchAndCategory,
  hasSearchOrCategory,
  readFiltersFromUrl,
  type LibraryFilters,
} from '../application/library-filters';
import { loadCategories, loadTemplates } from '../application/template.application';
import { useAsyncData } from '../../../shared/hooks/useAsyncData';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';

export type ListStatus = 'loading' | 'error' | 'empty' | 'not-found' | 'ready';

const SEARCH_DELAY_MS = 300;

export function useTemplateLibrary(docType: string) {
  const [filters, setFilters] = useState<LibraryFilters>(() => readFiltersFromUrl(window.location.search));

  useEffect(() => {
    function handleUrlChange() {
      setFilters(readFiltersFromUrl(window.location.search));
    }
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  function saveFilters(nextFilters: LibraryFilters, replace = false) {
    const url = window.location.pathname + buildUrlSearch(nextFilters);
    if (replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    setFilters(nextFilters);
  }

  const searchKeyword = useDebouncedValue(filters.keyword, SEARCH_DELAY_MS);

  const templates = useAsyncData(
    () => loadTemplates(docType, { ...filters, keyword: searchKeyword }),
    [docType, filters.categoryId, searchKeyword],
  );
  const categories = useAsyncData(() => loadCategories(docType), [docType]);

  const templateList = templates.data || [];
  const categoryList = categories.data || [];

  let templatesStatus: ListStatus = 'ready';
  if (templates.error) templatesStatus = 'error';
  else if (templates.data === null) templatesStatus = 'loading';
  else if (templateList.length === 0) templatesStatus = hasSearchOrCategory(filters) ? 'not-found' : 'empty';

  return {
    docType: findDocType(docType),
    filters,

    templates: templateList,
    templatesStatus,
    templatesError: templates.error,
    isRefreshing: templates.isLoading && templates.data !== null,

    categories: categoryList,

    retry() {
      templates.reload();
      categories.reload();
    },
    changeKeyword(keyword: string) {
      saveFilters({ ...filters, keyword }, true);
    },
    changeCategory(categoryId: string) {
      saveFilters({ ...filters, categoryId });
    },
    clearFilters() {
      saveFilters(clearSearchAndCategory(filters));
    },
    openPreview(templateId: string) {
      saveFilters({ ...filters, previewId: templateId });
    },
    closePreview() {
      if (filters.previewId) {
        saveFilters({ ...filters, previewId: '' }, true);
      }
    },
  };
}
