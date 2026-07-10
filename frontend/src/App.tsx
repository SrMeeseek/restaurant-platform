import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import LoginPage from './modules/users/LoginPage';
import UsersPage from './modules/users/UsersPage';
import ChangePasswordPage from './modules/users/ChangePasswordPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import CategoriesPage from './modules/inventory/CategoriesPage';
import ProductsPage from './modules/inventory/ProductsPage';
import ProductCreatePage from './modules/inventory/ProductCreatePage';
import ProductEditPage from './modules/inventory/ProductEditPage';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route
              path="usuarios"
              element={
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="categorias"
              element={
                <AdminRoute>
                  <CategoriesPage />
                </AdminRoute>
              }
            />
            <Route
              path="productos"
              element={
                <AdminRoute>
                  <ProductsPage />
                </AdminRoute>
              }
            />
            <Route
              path="productos/nuevo"
              element={
                <AdminRoute>
                  <ProductCreatePage />
                </AdminRoute>
              }
            />
            <Route
              path="productos/:id/editar"
              element={
                <AdminRoute>
                  <ProductEditPage />
                </AdminRoute>
              }
            />
            <Route path="cambiar-contrasena" element={<ChangePasswordPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
