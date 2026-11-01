import { SearchIcon } from './icons';

type SearchBoxProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function SearchBox({ value, placeholder, onChange }: SearchBoxProps) {
  return (
    <label className="relative block">
      <span className="sr-only">Tìm mẫu</span>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-violet-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
      />
    </label>
  );
}
