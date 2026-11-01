import { useCreateDocument } from '../../documents/hooks/useCreateDocument';
import { useTemplateLibrary } from '../hooks/useTemplateLibrary';
import { CategoryChips } from '../components/CategoryChips';
import { GridIcon } from '../../../shared/components/icons';
import { SearchBox } from '../../../shared/components/SearchBox';
import { TemplateGrid } from '../components/TemplateGrid';
import { TemplatePreviewDialog } from '../components/TemplatePreviewDialog';
import { Toast } from '../../../shared/components/Toast';

type TemplateLibraryPageProps = {
  docType: string;
};

export function TemplateLibraryPage({ docType }: TemplateLibraryPageProps) {
  const library = useTemplateLibrary(docType);
  const creator = useCreateDocument({ onStart: library.closePreview });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {library.docType.libraryTitle}
        </h1>
      </header>

      <div className="space-y-4 rounded-2xl   bg-white p-4">
        <SearchBox
          value={library.filters.keyword}
          placeholder={library.docType.searchPlaceholder}
          onChange={library.changeKeyword}
        />
        <CategoryChips
          categories={library.categories}
          activeCategoryId={library.filters.categoryId}
          onChange={library.changeCategory}
        />
      </div>

      <TemplateGrid
        status={library.templatesStatus}
        templates={library.templates}
        error={library.templatesError}
        isRefreshing={library.isRefreshing}
        creatingTemplateId={creator.creatingTemplateId}
        onRetry={library.retry}
        onClearFilters={library.clearFilters}
        onPreview={library.openPreview}
        onCreate={creator.createFromTemplate}
      />

      <TemplatePreviewDialog
        templateId={library.filters.previewId}
        onClose={library.closePreview}
        onCreate={creator.createFromTemplate}
      />

      <Toast toast={creator.toast} onClose={creator.closeToast} />
    </div>
  );
}
