import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

// Permite el acceso solo a usuarios con rol ADMIN; redirige a los demas
export default function AdminRoute({ children }: Props) {
  const user = JSON.parse(localStorage.getItem('user') ?? '{}') as { role?: string };
  return user.role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}
