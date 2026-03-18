import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAuthConfig, login, register, loginWithGoogle } from '../utils/authApi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authConfig, setAuthConfig] = useState({ production: false });
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    getAuthConfig()
      .then(setAuthConfig)
      .catch(() => setAuthConfig({ production: false }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const data = await register(email, password, username);
        if (data.accessToken && data.user) {
          saveSession(data.accessToken, data.user, data.refreshToken);
          navigate(from, { replace: true });
          return;
        }
        setError(data.message || 'Vérifiez votre email pour activer votre compte.');
        if (data.verification_token) {
          navigate(`/verify-email?token=${encodeURIComponent(data.verification_token)}`, { replace: true });
        }
        return;
      }
      const data = await login(email, password);
      saveSession(data.accessToken, data.user, data.refreshToken);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const googleButtonRef = useRef(null);

  useEffect(() => {
    const production = authConfig.production === true;
    if (!production || !import.meta.env.VITE_GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const loadScript = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setError(null);
            setLoading(true);
            try {
              const data = await loginWithGoogle(response.credential);
              saveSession(data.accessToken, data.user, data.refreshToken);
              navigate(from, { replace: true });
            } catch (err) {
              setError(err.response?.data?.error || err.message || 'Connexion Google impossible');
            } finally {
              setLoading(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'continue_with',
        });
      }
    };
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      loadScript();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = loadScript;
    document.head.appendChild(script);
  }, [authConfig.production, from, navigate, saveSession]);

  const handleGoogleClick = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError('Connexion Google non configurée (VITE_GOOGLE_CLIENT_ID manquant)');
    }
  };

  const productionMode = authConfig.production === true;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-xl p-8 sm:p-10 shadow-xl sf-card-style">
        <p className="sf-section-label">Connexion</p>
        <h1 className="sf-heading-display mt-1" style={{ fontFamily: 'var(--sf-heading-font)', color: 'var(--sf-cta)' }}>
          LvlScript
        </h1>
        <p className="sf-subtitle-bracket mt-2 mb-8">
          (génère tes scripts vidéo pour 5 plateformes)
        </p>

        {productionMode && (
          <div className="mb-4 flex justify-center">
            <div ref={googleButtonRef} onClick={handleGoogleClick} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {isSignUp && productionMode && (
            <div>
              <label htmlFor="username" className="sf-label">Nom d&apos;utilisateur</label>
              <input
                id="username"
                type="text"
                placeholder="Pseudonyme"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="sf-input"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="sf-label">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sf-input"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="sf-label">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sf-input"
              required
            />
          </div>

          {error && (
            <p className="text-sm" role="alert" style={{ color: 'var(--sf-danger)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="sf-cta-button w-full flex items-center justify-center gap-2 bg-[var(--sf-cta)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer rounded-lg transition-colors"
            style={{ color: 'var(--sf-cta-text)' }}
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta-text)' }} />
                <span>Chargement…</span>
              </>
            ) : isSignUp ? (
              'Créer un compte'
            ) : (
              <>Se connecter 🚀</>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignUp((s) => !s);
            setError(null);
          }}
          className="w-full mt-5 text-center text-sm transition-colors hover:text-[var(--sf-text)] cursor-pointer"
          style={{ color: 'var(--sf-text-muted)' }}
        >
          {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
        </button>
      </div>
    </div>
  );
}
