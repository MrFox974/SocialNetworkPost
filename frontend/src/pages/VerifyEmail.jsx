import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verifyEmail } from '../utils/authApi';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Lien de vérification invalide.');
      return;
    }
    verifyEmail(token)
      .then((data) => {
        saveSession(data.accessToken, data.user, data.refreshToken);
        setStatus('success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.response?.data?.error || err.message || 'Lien expiré ou invalide.');
      });
  }, [token, saveSession, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-xl p-8 shadow-xl sf-card-style">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--sf-cta)' }}>Vérification de l&apos;email</h1>
        {status === 'loading' && (
          <p className="mt-4 flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta)' }} />
            Activation du compte…
          </p>
        )}
        {status === 'success' && (
          <p className="mt-4" style={{ color: 'var(--sf-text)' }}>Compte activé. Redirection…</p>
        )}
        {status === 'error' && (
          <>
            <p className="mt-4 text-sm" style={{ color: 'var(--sf-danger)' }}>{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="mt-4 sf-cta-button px-4 py-2 rounded-lg transition-colors hover:opacity-90 cursor-pointer"
              style={{ color: 'var(--sf-cta-text)', backgroundColor: 'var(--sf-cta)' }}
            >
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
