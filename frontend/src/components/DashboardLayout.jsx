import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GenerationProgressBar from './GenerationProgressBar';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const isProjectPage = pathname.startsWith('/dashboard/project/');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--sf-bg-gradient)', backgroundColor: 'var(--sf-bg)' }}>
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-bg-elevated)' }}>
        <div className="mx-auto px-6 sm:px-8 h-16 flex items-center justify-between" style={{ maxWidth: 'var(--sf-content-width)' }}>
          <Link
            to="/dashboard"
            className="text-xl font-bold tracking-tight transition-colors hover:opacity-90"
            style={{ fontFamily: 'var(--sf-heading-font)', color: 'var(--sf-cta)' }}
          >
            LvlScript
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/dashboard/plans"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--sf-text-muted)' }}
            >
              Plans
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--sf-text-muted)' }}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                Profil
                <span className="text-xs opacity-70" aria-hidden>{menuOpen ? '▲' : '▼'}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 py-1 min-w-[160px] rounded-lg border shadow-lg z-50"
                  style={{ backgroundColor: 'var(--sf-card)', borderColor: 'var(--sf-border)', boxShadow: 'var(--sf-card-shadow-hover)' }}
                  role="menu"
                >
                  <Link
                    to="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-left transition-colors hover:opacity-90 hover:bg-[var(--sf-card-hover)] rounded cursor-pointer"
                    style={{ color: 'var(--sf-text)' }}
                  >
                    Paramètres
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-90 hover:bg-[var(--sf-card-hover)] rounded cursor-pointer"
                    style={{ color: 'var(--sf-text-muted)' }}
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <GenerationProgressBar />
      <main
        className="flex-1 mx-auto px-6 sm:px-8 py-10 sm:py-12"
        style={{ maxWidth: isProjectPage ? 'var(--sf-project-content-width)' : 'var(--sf-content-width)' }}
      >
        <Outlet />
      </main>
      <footer className="mt-auto border-t py-8" style={{ borderColor: 'var(--sf-border)' }}>
        <div className="mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ maxWidth: 'var(--sf-content-width)' }}>
          <span className="text-sm" style={{ color: 'var(--sf-text-dim)' }}>
            © {new Date().getFullYear()} LvlScript
          </span>
          <span className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>
            Design · Code · Content
          </span>
        </div>
      </footer>
    </div>
  );
}
