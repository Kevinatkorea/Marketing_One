import { NavLink, useParams } from 'react-router-dom';
import { useState } from 'react';

const navItems = [
  { to: 'products', label: '상품/서비스 관리', icon: '📦' },
  { to: 'viral', label: '바이럴', icon: '📋' },
  { to: 'reports', label: '운영보고서', icon: '📊' },
];

export default function Sidebar() {
  const { id } = useParams();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      {/* Mobile overlay */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-800 text-zinc-100 lg:hidden"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="메뉴 토글"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {collapsed ? (
            <>
              <line x1="4" y1="5" x2="16" y2="5" />
              <line x1="4" y1="10" x2="16" y2="10" />
              <line x1="4" y1="15" x2="16" y2="15" />
            </>
          ) : (
            <>
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </>
          )}
        </svg>
      </button>

      {/* Backdrop for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-60
          bg-zinc-900 border-r border-zinc-800
          flex flex-col
          transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-zinc-800 shrink-0">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              P1
            </div>
            <span className="text-zinc-100 font-semibold text-lg tracking-tight group-hover:text-blue-400 transition-colors">
              PerformanceOne
            </span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {/* Dashboard link */}
          <NavLink
            to={`/projects/${id}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`
            }
            onClick={() => setCollapsed(true)}
          >
            <span className="text-base">📊</span>
            <span>대시보드</span>
          </NavLink>

          <div className="h-px bg-zinc-800 my-3" />

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`/projects/${id}/${item.to}`}
              end={item.to === 'viral'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`
              }
              onClick={() => setCollapsed(true)}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <div className="text-xs text-zinc-600">
            PerformanceOne v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
