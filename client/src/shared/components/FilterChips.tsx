export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type FilterChipsProps = {
  label: string;
  options: FilterOption[];
  activeValue: string;
  onChange: (value: string) => void;
};

export function FilterChips({ label, options, activeValue, onChange }: FilterChipsProps) {
  if (options.length === 0) return null;

  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const isActive = option.value === activeValue;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition ${
              isActive ? 'bg-violet-700 text-white shadow-sm' : 'bg-indigo-50 text-slate-700 hover:bg-indigo-100'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`text-xs ${isActive ? 'text-violet-200' : 'text-slate-400'}`}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
