import type { MenuItem } from './menu';
import { LogoIcon } from '../shared/components/icons';

type SidebarProps = {
  menuItems: MenuItem[];
  activePath: string;
  onNavigate: (path: string) => void;
};

export function Sidebar({ menuItems, activePath, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white md:w-64">
      <div className="flex h-16 items-center gap-3 px-4 md:px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
          <LogoIcon className="size-5" />
        </div>
        <span className="hidden text-lg font-bold tracking-tight text-slate-900 md:inline">Dashboard</span>
      </div>

      <nav className="flex-1 px-3 py-4" aria-label="Menu chính">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === activePath;

            return (
              <li key={item.path}>
                <a
                  href={item.path}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(item.path);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
