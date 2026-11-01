import { FilterChips } from '../../../shared/components/FilterChips';
import type { Category } from '../api/template.types';

type CategoryChipsProps = {
  categories: Category[];
  activeCategoryId: string;
  onChange: (categoryId: string) => void;
};

export function CategoryChips({ categories, activeCategoryId, onChange }: CategoryChipsProps) {
  if (categories.length === 0) return null;

  const options = [
    { value: '', label: 'Tất cả' },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  return <FilterChips label="Lọc theo danh mục" options={options} activeValue={activeCategoryId} onChange={onChange} />;
}
