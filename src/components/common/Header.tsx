import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';

const routeLabels: Record<string, string> = {
  dashboard: '대시보드',
  viral: '바이럴 관리',
  guides: '가이드 관리',
  new: '바이럴 등록',
  bulk: '바이럴 일괄 등록',
};

export default function Header() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProject, projects, setCurrentProject } = useProjectStore();

  // Build breadcrumbs from path
  const pathSegments = location.pathname
    .replace(`/projects/${id}/`, '')
    .split('/')
    .filter(Boolean);

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/projects/${id}/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = routeLabels[segment] || segment;
    return { path, label };
  });

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const project = projects.find((p) => p.id === e.target.value);
    if (project) {
      setCurrentProject(project);
      const currentSubPath = location.pathname.replace(`/projects/${id}`, '');
      navigate(`/projects/${project.id}${currentSubPath}`);
    }
  };

  return (
    <header className="h-16 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Link
          to={`/projects/${id}/dashboard`}
          className="text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
        >
          {currentProject?.name || '프로젝트'}
        </Link>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.path} className="flex items-center gap-2 min-w-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-zinc-600 shrink-0"
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Link
              to={crumb.path}
              className="text-zinc-100 font-medium truncate hover:text-blue-400 transition-colors"
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </div>

      {/* Right: Project selector */}
      <div className="flex items-center gap-4 shrink-0">
        <select
          value={currentProject?.id || ''}
          onChange={handleProjectChange}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
