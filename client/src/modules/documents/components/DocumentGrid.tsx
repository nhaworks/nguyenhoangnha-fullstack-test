import { CardGrid, CardGridSkeleton } from '../../../shared/components/CardGrid';
import { StatusView } from '../../../shared/components/StatusView';
import type { DocumentCardView } from '../application/document.application';
import type { DocumentListStatus } from '../hooks/useDocumentList';
import { DocumentCard } from './DocumentCard';

type DocumentGridProps = {
  status: DocumentListStatus;
  documents: DocumentCardView[];
  emptyTitle: string;
  error: string | null;
  onRetry: () => void;
  onOpen: (documentId: string) => void;
};

export function DocumentGrid({ status, documents, emptyTitle, error, onRetry, onOpen }: DocumentGridProps) {
  switch (status) {
    case 'loading':
      return <CardGridSkeleton label="Đang tải danh sách tài liệu" />;

    case 'error':
      return (
        <StatusView
          type="error"
          title="Không tải được danh sách tài liệu"
          description={error}
          actionLabel="Thử lại"
          onAction={onRetry}
        />
      );

    case 'empty':
      return (
        <StatusView
          type="empty"
          title={emptyTitle}
          description="Vào Mẫu tài liệu hoặc Mẫu trình chiếu, chọn một mẫu và bấm Tạo mẫu."
        />
      );

    case 'ready':
      return (
        <CardGrid>
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} onOpen={onOpen} />
          ))}
        </CardGrid>
      );
  }
}
