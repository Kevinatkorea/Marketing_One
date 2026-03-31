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
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
