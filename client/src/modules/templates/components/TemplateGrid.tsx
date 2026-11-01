import type { TemplateSummary } from '../api/template.types';
import type { ListStatus } from '../hooks/useTemplateLibrary';
import { CardGrid, CardGridSkeleton } from '../../../shared/components/CardGrid';
import { StatusView } from '../../../shared/components/StatusView';
import { TemplateCard } from './TemplateCard';

type TemplateGridProps = {
  status: ListStatus;
  templates: TemplateSummary[];
  error: string | null;
  isRefreshing: boolean;
  creatingTemplateId: string;
  onRetry: () => void;
  onClearFilters: () => void;
  onPreview: (templateId: string) => void;
  onCreate: (template: TemplateSummary) => void;
};

export function TemplateGrid(props: TemplateGridProps) {
  switch (props.status) {
    case 'loading':
      return <CardGridSkeleton label="Đang tải danh sách mẫu" />;

    case 'error':
      return (
        <StatusView
          type="error"
          title="Không tải được danh sách mẫu"
          description={props.error}
          actionLabel="Thử lại"
          onAction={props.onRetry}
        />
      );

    case 'not-found':
      return (
        <StatusView
          type="empty"
          title="Không tìm thấy mẫu phù hợp"
          description="Thử từ khoá khác hoặc bỏ lọc danh mục."
          actionLabel="Xoá bộ lọc"
          onAction={props.onClearFilters}
        />
      );

    case 'empty':
      return <StatusView type="empty" title="Chưa có mẫu nào" description="Loại tài liệu này hiện chưa có mẫu." />;

    case 'ready':
      return (
        <CardGrid isDimmed={props.isRefreshing}>
          {props.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isCreating={template.id === props.creatingTemplateId}
              onPreview={props.onPreview}
              onCreate={props.onCreate}
            />
          ))}
        </CardGrid>
      );
  }
}
