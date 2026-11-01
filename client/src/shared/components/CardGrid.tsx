import type { ReactNode } from 'react';

const GRID_CLASS = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4';
const SKELETON_COUNT = 8;

type CardGridProps = {
  children: ReactNode;
  isDimmed?: boolean;
};

export function CardGrid({ children, isDimmed = false }: CardGridProps) {
  return <div className={`${GRID_CLASS} transition-opacity ${isDimmed ? 'opacity-60' : ''}`}>{children}</div>;
}

export function CardGridSkeleton({ label }: { label: string }) {
  return (
    <div className={GRID_CLASS} aria-busy="true" aria-label={label}>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
