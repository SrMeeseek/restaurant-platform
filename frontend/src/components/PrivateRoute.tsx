import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

// Redirige al login si no hay sesion activa
export default function PrivateRoute({ children }: Props) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}
