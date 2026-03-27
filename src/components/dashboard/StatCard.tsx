interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'zinc';
  icon?: string;
}

const colorMap = {
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  red: 'text-red-400',
  zinc: 'text-zinc-300',
};

const bgColorMap = {
  blue: 'bg-blue-500/10',
  green: 'bg-emerald-500/10',
  yellow: 'bg-amber-500/10',
  red: 'bg-red-500/10',
  zinc: 'bg-zinc-500/10',
};

const trendIcons = {
  up: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-400">
      <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  down: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  neutral: null,
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  color = 'blue',
  icon,
}: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        {icon && (
          <span
            className={`w-8 h-8 rounded-lg ${bgColorMap[color]} flex items-center justify-center text-base`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${colorMap[color]}`}>
          {value}
        </span>
        {trend && trendIcons[trend]}
      </div>
      {subtitle && (
        <span className="text-xs text-zinc-500">{subtitle}</span>
      )}
    </div>
  );
}
