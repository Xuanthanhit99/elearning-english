import { Navigate } from 'react-router-dom';
import { getCurrentUser } from './api/tokenStore';

type Props = {
  roles: string[];
  children: React.ReactNode;
};

export default function RoleRoute({ roles, children }: Props) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}