import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import ProjectList from './pages/ProjectList';
import ProjectDashboard from './pages/ProjectDashboard';
import ViralManagement from './pages/ViralManagement';
import GuideManagement from './pages/GuideManagement';
import BulkRegistration from './pages/BulkRegistration';
import ViralDetail from './pages/ViralDetail';
import ProductManagement from './pages/ProductManagement';

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
        element: <ViralManagement />,
      },
      {
        path: 'viral/guides',
        element: <GuideManagement />,
      },
      {
        path: 'products',
        element: <ProductManagement />,
      },
      {
        path: 'viral/bulk',
        element: <BulkRegistration />,
      },
      {
        path: 'viral/:vid',
        element: <ViralDetail />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
