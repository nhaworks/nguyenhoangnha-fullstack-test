import { FilterChips } from '../../../shared/components/FilterChips';
import { DocumentGrid } from '../components/DocumentGrid';
import { useDocumentList } from '../hooks/useDocumentList';
import { useDocumentRoute } from '../hooks/useDocumentRoute';

export function DocumentListPage() {
  const documentList = useDocumentList();
  const route = useDocumentRoute();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Quản lý tài liệu</h1>
      </header>

      <div className="rounded-2xl bg-white p-4">
        <FilterChips
          label="Lọc theo loại tài liệu"
          options={documentList.typeTabs}
          activeValue={documentList.activeType}
          onChange={documentList.changeType}
        />
      </div>

      <DocumentGrid
        status={documentList.status}
        documents={documentList.documents}
        emptyTitle={documentList.emptyTitle}
        error={documentList.error}
        onRetry={documentList.reload}
        onOpen={route.openDocument}
      />
    </div>
  );
}
