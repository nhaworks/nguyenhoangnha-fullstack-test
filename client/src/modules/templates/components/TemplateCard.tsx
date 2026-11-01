import type { TemplateSummary } from '../api/template.types';
import { EyeIcon, PlusIcon, TagIcon } from '../../../shared/components/icons';
import { Thumbnail } from '../../../shared/components/Thumbnail';

type TemplateCardProps = {
  template: TemplateSummary;
  isCreating: boolean;
  onPreview: (templateId: string) => void;
  onCreate: (template: TemplateSummary) => void;
};

export function TemplateCard({ template, isCreating, onPreview, onCreate }: TemplateCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-600/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 p-4">
        <Thumbnail url={template.thumbnailUrl} alt={`Ảnh xem trước mẫu ${template.name}`} docType={template.type} />

        <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-2 px-3 bg-slate-900/50 opacity-0 backdrop-blur-[1px] transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:items-end pointer-coarse:bg-transparent pointer-coarse:pb-3 pointer-coarse:opacity-100 pointer-coarse:backdrop-blur-none">
          <button
            type="button"
            onClick={() => onPreview(template.id)}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow transition hover:bg-slate-100"
          >
            <EyeIcon className="size-4" />
            Xem trước
          </button>
          <button
            type="button"
            onClick={() => onCreate(template)}
            disabled={isCreating}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-70"
          >
            <PlusIcon className="size-4" />
            {isCreating ? 'Đang tạo…' : 'Tạo mẫu'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-slate-100 p-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-violet-600">
          <TagIcon className="size-3.5" />
          {template.category.name}
        </span>
        <h3 className="line-clamp-1 font-semibold text-slate-900" title={template.name}>
          {template.name}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-500">{template.description}</p>
      </div>
    </article>
  );
}
