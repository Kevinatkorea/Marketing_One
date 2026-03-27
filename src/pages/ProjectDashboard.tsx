import { Navigate, useParams } from 'react-router-dom';

export default function ProjectDashboard() {
  const { id } = useParams();
  return <Navigate to={`/projects/${id}/viral`} replace />;
}
