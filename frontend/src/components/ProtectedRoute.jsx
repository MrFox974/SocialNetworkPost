import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api, { getAccessToken } from '../../utils/api';

export default function ProtectedRoute({ children }) {
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setValid(false);
      setLoading(false);
      return;
    }
    api
      .get('/api/auth/me')
      .then(() => setValid(true))
      .catch(() => setValid(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sf-bg)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-accent)' }} />
      </div>
    );
  }

  if (!valid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
