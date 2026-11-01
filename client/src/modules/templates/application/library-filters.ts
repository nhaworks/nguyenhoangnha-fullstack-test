export type LibraryFilters = {
  keyword: string;
  categoryId: string;
  previewId: string;
};

export function readFiltersFromUrl(search: string): LibraryFilters {
  const params = new URLSearchParams(search);
  return {
    keyword: params.get('q') || '',
    categoryId: params.get('category') || '',
    previewId: params.get('preview') || '',
  };
}

export function buildUrlSearch(filters: LibraryFilters): string {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('q', filters.keyword);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.previewId) params.set('preview', filters.previewId);

  const query = params.toString();
  return query ? '?' + query : '';
}

export function clearSearchAndCategory(filters: LibraryFilters): LibraryFilters {
  return { ...filters, keyword: '', categoryId: '' };
}

export function hasSearchOrCategory(filters: LibraryFilters): boolean {
  return filters.keyword.trim() !== '' || filters.categoryId !== '';
}
