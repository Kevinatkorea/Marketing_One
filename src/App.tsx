import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import ProjectList from './pages/ProjectList';
import ProjectDashboard from './pages/ProjectDashboard';
import ViralHub from './pages/ViralHub';
import ViralDetail from './pages/ViralDetail';
import ProductManagement from './pages/ProductManagement';
import ReportManagement from './pages/ReportManagement';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProjectList />,
  },
  {
    path: '/projects/:id',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="viral" replace />,
      },
      {
        path: 'dashboard',
        element: <ProjectDashboard />,
      },
      {
        path: 'viral',
        element: <ViralHub />,
      },
      {
        path: 'viral/:vid',
        element: <ViralDetail />,
      },
      {
        path: 'products',
        element: <ProductManagement />,
      },
      {
        path: 'reports',
        element: <ReportManagement />,
      },
      // 프로젝트 내부에서 잘못된 하위 경로 → 메인으로
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  // 최상위에서 매칭 실패한 모든 경로 → 메인으로
  // 예: /projects/ (id 누락), /typo, 존재하지 않는 북마크 등
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
