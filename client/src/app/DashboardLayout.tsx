import type { ReactNode } from 'react';
import type { MenuItem } from './menu';
import { Sidebar } from './Sidebar';

type DashboardLayoutProps = {
  menuItems: MenuItem[];
  activePath: string;
  onNavigate: (path: string) => void;
  children: ReactNode;
};

export function DashboardLayout({ menuItems, activePath, onNavigate, children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar menuItems={menuItems} activePath={activePath} onNavigate={onNavigate} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
