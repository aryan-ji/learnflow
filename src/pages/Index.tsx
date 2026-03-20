import { Navigate } from 'react-router-dom';
import Landing from './Landing';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  
  return <Landing />;
};

export default Index;
