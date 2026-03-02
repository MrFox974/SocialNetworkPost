import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { updateProfile, deleteAccount } from '../utils/authApi';
import { unsubscribe } from '../../utils/stripeApi';

const PLAN_NAMES = { starter: 'Starter', maitrise: 'Maîtrise', performance: 'Performance' };

function formatDate(d) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const isGoogle = user?.auth_provider === 'google';

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const planId = user?.subscription_plan || 'starter';
  const planName = PLAN_NAMES[planId] || planId;
  const isPaidPlan = planId !== 'starter' && planId !== 'free';
  const periodStart = user?.subscription_current_period_start;
  const periodEnd = user?.subscription_current_period_end;

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const payload = { username: username.trim() || undefined };
      if (!isGoogle) {
        if (email.trim()) payload.email = email.trim().toLowerCase();
        if (newPassword) {
          if (!currentPassword) {
            addToast('Indique ton mot de passe actuel pour en changer.', 'error');
            setProfileLoading(false);
            return;
          }
          if (newPassword !== confirmPassword) {
            addToast('Les deux mots de passe ne correspondent pas.', 'error');
            setProfileLoading(false);
            return;
          }
          payload.password = newPassword;
          payload.currentPassword = currentPassword;
        }
      }
      const { user: updated } = await updateProfile(payload);
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Profil mis à jour.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Impossible de mettre à jour le profil.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!isPaidPlan) return;
    if (!window.confirm('Tu seras désabonné à la fin de ta période en cours. Continuer ?')) return;
    setUnsubscribeLoading(true);
    try {
      await unsubscribe();
      await refreshUser();
      addToast('Désabonnement pris en compte. Tu conserves ton plan jusqu\'à la fin de la période.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Impossible de résilier l\'abonnement.', 'error');
    } finally {
      setUnsubscribeLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') return;
    setDeleteLoading(true);
    try {
      await deleteAccount();
      logout();
      addToast('Compte supprimé.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      addToast(err.response?.data?.error || 'Impossible de supprimer le compte.', 'error');
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p style={{ color: 'var(--sf-text-muted)' }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-2xl mx-auto">
      <section className="space-y-4">
        <p className="sf-section-label">Paramètres</p>
        <h1 className="sf-heading-display text-2xl md:text-3xl">Mon compte</h1>
      </section>

      {/* Informations personnelles */}
      <section className="rounded-2xl border p-6" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--sf-text)', fontFamily: 'var(--sf-heading-font)' }}>
          Informations personnelles
        </h2>
        {isGoogle && (
          <p className="text-sm mb-4" style={{ color: 'var(--sf-text-muted)' }}>
            Compte connecté via Google. Seul le nom d’affichage peut être modifié ici.
          </p>
        )}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sf-text)' }}>
              Nom d’affichage
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-transparent"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
              placeholder="Ton prénom ou pseudo"
            />
          </div>
          {!isGoogle && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sf-text)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-transparent"
                  style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
                  required
                />
              </div>
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--sf-border)' }}>
                <p className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>
                  Changer le mot de passe (laisser vide pour ne pas modifier)
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sf-text)' }}>
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-transparent"
                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sf-text)' }}>
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-transparent"
                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sf-text)' }}>
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-transparent"
                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={profileLoading}
            className="sf-cta-button px-6 py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--sf-cta)',
              color: 'var(--sf-cta-text)',
            }}
          >
            {profileLoading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </section>

      {/* Abonnement */}
      <section className="rounded-2xl border p-6" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--sf-text)', fontFamily: 'var(--sf-heading-font)' }}>
          Abonnement
        </h2>
        <div className="space-y-2 text-sm" style={{ color: 'var(--sf-text-muted)' }}>
          <p>
            <span className="font-medium" style={{ color: 'var(--sf-text)' }}>Plan actuel :</span> {planName}
          </p>
          <p>
            <span className="font-medium" style={{ color: 'var(--sf-text)' }}>Période en cours :</span>{' '}
            du {formatDate(periodStart)} au {formatDate(periodEnd)}
          </p>
        </div>
        {isPaidPlan && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--sf-border)' }}>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={unsubscribeLoading}
              className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors hover:bg-[var(--sf-card-hover)] hover:border-[var(--sf-border-light)] disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
            >
              {unsubscribeLoading ? 'En cours…' : 'Se désabonner (fin de période)'}
            </button>
            <p className="text-xs mt-2" style={{ color: 'var(--sf-text-dim)' }}>
              Tu conserves l’accès au plan payant jusqu’à la fin de la période déjà facturée.
            </p>
          </div>
        )}
      </section>

      {/* Supprimer le compte */}
      <section className="rounded-2xl border p-6" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--sf-text)', fontFamily: 'var(--sf-heading-font)' }}>
          Supprimer le compte
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--sf-text-muted)' }}>
          Cette action est irréversible. Toutes tes données seront supprimées.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400"
          style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
        >
          Supprimer mon compte
        </button>
      </section>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
        >
          <div
            className="rounded-2xl border p-6 max-w-md w-full shadow-xl"
            style={{ backgroundColor: 'var(--sf-bg)', borderColor: 'var(--sf-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-modal-title" className="text-lg font-semibold mb-2" style={{ color: 'var(--sf-text)' }}>
              Confirmer la suppression
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--sf-text-muted)' }}>
              Pour confirmer, saisis <strong>SUPPRIMER</strong> ci-dessous.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
              placeholder="SUPPRIMER"
              className="w-full px-4 py-2 rounded-lg border mb-4 bg-transparent"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
              autoComplete="off"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[var(--sf-card-hover)] disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'SUPPRIMER' || deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: deleteConfirm !== 'SUPPRIMER' ? 'var(--sf-border)' : 'var(--sf-danger)',
                  color: deleteConfirm !== 'SUPPRIMER' ? 'var(--sf-text-muted)' : 'white',
                }}
              >
                {deleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
