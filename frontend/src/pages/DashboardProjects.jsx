import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { getProjects, createProject } from '../utils/projectApi';
import { useToast } from '../contexts/ToastContext';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchProjects = async () => {
    try {
      const list = await getProjects();
      setProjects(list);
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleNewProject = async () => {
    setCreating(true);
    try {
      const project = await createProject('Nouveau projet', '');
      addToast('Projet créé ✓', 'success');
      navigate(`/dashboard/project/${project.id}`);
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${deleteModal.id}`);
      setProjects((prev) => prev.filter((p) => p.id !== deleteModal.id));
      setDeleteModal(null);
      addToast('Projet supprimé', 'info');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <p className="sf-section-label">01 — Projets</p>
          <h1 className="sf-heading-display">Mes projets</h1>
          <p className="sf-subtitle-bracket mt-2">(ou crée-en un nouveau)</p>
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={handleNewProject}
          className="sf-cta-button flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto bg-[var(--sf-cta)] hover:opacity-90 disabled:opacity-60"
          style={{ color: 'var(--sf-cta-text)' }}
        >
          {creating ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta-text)' }} />
              Création…
            </>
          ) : (
            <>+ Nouveau projet</>
          )}
        </button>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--sf-card)' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed"
          style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}
        >
          <p className="mb-2 text-lg font-medium" style={{ color: 'var(--sf-text-muted)' }}>Aucun projet pour l'instant</p>
          <p className="text-sm mb-6" style={{ color: 'var(--sf-text-dim)' }}>Crée ton premier projet pour générer des scripts vidéo</p>
          <button
            type="button"
            onClick={handleNewProject}
            disabled={creating}
            className="sf-cta-button bg-[var(--sf-cta)] hover:opacity-90 disabled:opacity-60"
            style={{ color: 'var(--sf-cta-text)' }}
          >
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if (e.target.closest('[data-delete]')) return;
                navigate(`/dashboard/project/${p.id}`);
              }}
              onKeyDown={(e) => e.key === 'Enter' && !e.target.closest('[data-delete]') && navigate(`/dashboard/project/${p.id}`)}
              className="group rounded-xl border p-6 transition-all duration-200 cursor-pointer flex flex-col border-[var(--sf-border)] bg-[var(--sf-card)] hover:bg-[var(--sf-card-hover)] hover:border-[var(--sf-cta)]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold truncate flex-1" style={{ color: 'var(--sf-text)' }}>{p.name || 'Sans nom'}</h2>
                <button
                  type="button"
                  data-delete
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModal(p);
                  }}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: 'var(--sf-text-dim)' }}
                  aria-label="Supprimer"
                >
                  ×
                </button>
              </div>
              <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--sf-text-muted)' }}>
                {p.saas_prompt ? `${p.saas_prompt.slice(0, 80)}…` : 'Aucune description'}
              </p>
              <span className="text-xs mt-auto pt-3" style={{ color: 'var(--sf-text-dim)' }}>{formatDate(p.updated_at)}</span>
            </div>
          ))}
        </div>
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-xl border border-[var(--sf-border)]"
            style={{ backgroundColor: 'var(--sf-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--sf-text)', fontFamily: 'var(--sf-heading-font)' }}>Supprimer ce projet ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--sf-text-muted)' }}>
              Les propositions liées seront aussi supprimées. Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg border font-medium transition-colors border-[var(--sf-border)] hover:bg-[var(--sf-border)]"
                style={{ color: 'var(--sf-text-muted)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg font-medium bg-[var(--sf-danger)] text-white hover:opacity-90 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
