import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';

const BODY_SCROLLBAR_CLASS = 'sf-page-hide-scrollbar';
import api from '../../utils/api';
import { generateProposals } from '../utils/speechApi';
import { getProject, updateProject } from '../utils/projectApi';
import { useToast } from '../contexts/ToastContext';
import SpeechCardSkeleton from '../components/SpeechCardSkeleton';
import { toDisplayId } from '../utils/format';

const MAX_DRAFTS = 50;

function truncateLines(text, maxLines = 3) {
  if (!text) return '';
  const lines = String(text).split(/\n/).slice(0, maxLines);
  const joined = lines.join('\n');
  return joined.length < text.length ? `${joined}…` : joined;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Mélange aléatoire pour varier les références envoyées à l'API (limite la convergence). */
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState(
    location.state?.tab === 'published' ? 'published' : location.state?.tab === 'selection' ? 'selection' : 'proposals'
  );
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState([]);
  const [published, setPublished] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingScore, setUpdatingScore] = useState(null);
  const [saasPrompt, setSaasPrompt] = useState('');
  const [saasPromptModalOpen, setSaasPromptModalOpen] = useState(false);
  const [promptEditValue, setPromptEditValue] = useState('');
  const [savingPromptModal, setSavingPromptModal] = useState(false);
  const [quickEditItem, setQuickEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ hook: '', context: '', demo: '', cta: '' });
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [selectionActionItem, setSelectionActionItem] = useState(null);
  const [selectionActionLoading, setSelectionActionLoading] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameEdit, setProjectNameEdit] = useState('');
  const [savingProjectName, setSavingProjectName] = useState(false);
  const projectNameInputRef = useRef(null);

  const fetchProject = useCallback(async () => {
    try {
      const p = await getProject(projectId);
      setProject(p);
      setSaasPrompt(p.saas_prompt || '');
    } catch (err) {
      addToast(`Erreur projet : ${err.response?.data?.error || err.message}`, 'error');
      navigate('/dashboard');
    }
  }, [projectId, navigate, addToast]);

  useEffect(() => {
    if (editingProjectName && projectNameInputRef.current) {
      projectNameInputRef.current.focus();
      projectNameInputRef.current.select();
    }
  }, [editingProjectName]);

  const handleSaveProjectName = useCallback(async () => {
    if (!project || !projectId) return;
    const trimmed = projectNameEdit.trim() || project.name;
    if (trimmed === project.name) {
      setEditingProjectName(false);
      return;
    }
    setSavingProjectName(true);
    try {
      const p = await updateProject(projectId, { name: trimmed });
      setProject(p);
      setEditingProjectName(false);
      addToast('Nom du projet enregistré ✓', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Impossible d\'enregistrer le nom', 'error');
    } finally {
      setSavingProjectName(false);
    }
  }, [project, projectId, projectNameEdit, addToast]);

  const fetchSpeeches = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/speeches?project_id=${projectId}`);
      const list = data.speeches || [];
      setProposals(list.filter((s) => s.status === 'draft'));
      setSelected(list.filter((s) => s.status === 'draft' && s.in_selection));
      setPublished(list.filter((s) => s.status === 'published'));
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    document.documentElement.classList.add(BODY_SCROLLBAR_CLASS);
    return () => document.documentElement.classList.remove(BODY_SCROLLBAR_CLASS);
  }, []);

  useEffect(() => {
    if (projectId) fetchSpeeches();
  }, [projectId, fetchSpeeches]);

  const handleGenerate = async () => {
    const count = proposals.length;
    if (count >= MAX_DRAFTS) {
      addToast(`Limite de ${MAX_DRAFTS} propositions atteinte. Supprime ou mets en ligne des scripts.`, 'error');
      return;
    }
    setGenerating(true);
    try {
      const draftsPart = proposals
        .slice(0, 30)
        .map((s) => `Hook: ${(s.hook || '').slice(0, 80)} | Pilier: ${s.pillar || '-'}`)
        .join('\n');
      const publishedHooks = shuffle(published)
        .slice(0, 50)
        .map((s) => `Hook: ${(s.hook || '').slice(0, 80)} | Pilier: ${s.pillar || '-'}`)
        .join('\n');
      const existingSummary = publishedHooks
        ? `${draftsPart}${draftsPart ? '\n' : ''}[Déjà publiés]\n${publishedHooks}`
        : draftsPart;

      const publishedFormulations = shuffle(published)
        .slice(0, 20)
        .map((s) => {
          const scorePart = s.score != null ? ` [Score: ${s.score}]` : '';
          return `--- Script mis en ligne${scorePart} ---
Hook: ${s.hook || ''}
Contexte: ${(s.context || '').slice(0, 300)}
Démo: ${(s.demo || '').slice(0, 300)}
CTA: ${s.cta || ''}`;
        })
        .join('\n\n');
      const selectionSummary = shuffle(selected)
        .slice(0, 15)
        .map((s) => `--- Script en sélection ---\nHook: ${s.hook || ''}\nContexte: ${(s.context || '').slice(0, 250)}\nDémo: ${(s.demo || '').slice(0, 250)}\nCTA: ${s.cta || ''}`)
        .join('\n\n');
      const scripts = await generateProposals(existingSummary, publishedFormulations, selectionSummary, saasPrompt);
      const toInsert = scripts.slice(0, MAX_DRAFTS - count).map((s) => ({
        hook: s.hook || '',
        hook_type: s.hook_type || null,
        context: s.context || '',
        demo: s.demo || '',
        cta: s.cta || '',
        pillar: s.pillar || null,
      }));
      await api.post('/api/speeches', { speeches: toInsert, project_id: projectId });
      await fetchSpeeches();
      addToast('Génération terminée ✓', 'success');
    } catch (err) {
      console.error(err);
      addToast(`Erreur : ${err.response?.data?.error || err.message || 'génération impossible'}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!deleteModal || deleteModal.id !== id) return;
    setDeleting(true);
    try {
      await api.delete(`/api/speeches/${id}`);
      setProposals((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => prev.filter((s) => s.id !== id));
      setDeleteModal(null);
      addToast('Proposition supprimée', 'info');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveFromSelection = async (id) => {
    try {
      await api.put(`/api/speeches/${id}`, { in_selection: false });
      setSelected((prev) => prev.filter((s) => s.id !== id));
      setProposals((prev) => prev.map((s) => (s.id === id ? { ...s, in_selection: false } : s)));
      addToast('Retiré de la sélection', 'info');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleAddToSelection = async (id) => {
    try {
      await api.put(`/api/speeches/${id}`, { in_selection: true });
      setProposals((prev) => prev.map((s) => (s.id === id ? { ...s, in_selection: true } : s)));
      setSelected((prev) => {
        if (prev.some((s) => s.id === id)) return prev;
        const item = proposals.find((s) => s.id === id);
        return item ? [...prev, { ...item, in_selection: true }] : prev;
      });
      addToast('Ajouté à la sélection', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handlePublishFromSelection = async (id) => {
    try {
      const publishedAt = new Date().toISOString();
      await api.put(`/api/speeches/${id}`, {
        status: 'published',
        published_at: publishedAt,
        in_selection: false,
      });
      const source = [...proposals, ...selected].find((s) => s.id === id);
      const updated = source ? { ...source, status: 'published', published_at: publishedAt, in_selection: false } : null;
      setSelected((prev) => prev.filter((s) => s.id !== id));
      setProposals((prev) => prev.filter((s) => s.id !== id));
      if (updated) setPublished((prev) => [updated, ...prev.filter((s) => s.id !== id)]);
      addToast('Script mis en ligne ✓', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const openQuickEdit = (s) => {
    setQuickEditItem(s);
    setEditForm({
      hook: s.hook || '',
      context: s.context || '',
      demo: s.demo || '',
      cta: s.cta || '',
    });
  };

  const handleQuickEditSave = async () => {
    if (!quickEditItem) return;
    setQuickEditSaving(true);
    try {
      await api.put(`/api/speeches/${quickEditItem.id}`, {
        hook: editForm.hook,
        context: editForm.context,
        demo: editForm.demo,
        cta: editForm.cta,
      });
      await fetchSpeeches();
      setQuickEditItem(null);
      addToast('Enregistré ✓', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setQuickEditSaving(false);
    }
  };

  const handleQuickEditPublish = async () => {
    if (!quickEditItem) return;
    setQuickEditSaving(true);
    try {
      const publishedAt = new Date().toISOString();
      await api.put(`/api/speeches/${quickEditItem.id}`, {
        hook: editForm.hook,
        context: editForm.context,
        demo: editForm.demo,
        cta: editForm.cta,
        status: 'published',
        published_at: publishedAt,
      });
      await fetchSpeeches();
      setQuickEditItem(null);
      addToast('Script mis en ligne ✓', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setQuickEditSaving(false);
    }
  };

  const handleSelectionAction = async (action) => {
    const item = selectionActionItem;
    if (!item) return;
    setSelectionActionLoading(true);
    try {
      if (action === 'delete') {
        await api.delete(`/api/speeches/${item.id}`);
        setProposals((prev) => prev.filter((s) => s.id !== item.id));
        setSelected((prev) => prev.filter((s) => s.id !== item.id));
        setPublished((prev) => prev.filter((s) => s.id !== item.id));
        addToast('Script supprimé', 'info');
      } else if (action === 'remove') {
        await api.put(`/api/speeches/${item.id}`, { in_selection: false });
        setSelected((prev) => prev.filter((s) => s.id !== item.id));
        setProposals((prev) => prev.map((s) => (s.id === item.id ? { ...s, in_selection: false } : s)));
        addToast('Retiré de la sélection', 'info');
      }
      setSelectionActionItem(null);
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setSelectionActionLoading(false);
    }
  };

  const handleScoreChange = async (id, score) => {
    setUpdatingScore(id);
    try {
      await api.put(`/api/speeches/${id}`, { score });
      setPublished((prev) => prev.map((s) => (s.id === id ? { ...s, score } : s)));
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setUpdatingScore(null);
    }
  };

  const handleSavePromptModal = async () => {
    setSavingPromptModal(true);
    try {
      const p = await updateProject(projectId, { saas_prompt: promptEditValue });
      setProject(p);
      setSaasPrompt(promptEditValue);
      setSaasPromptModalOpen(false);
      addToast('Prompt sauvegardé ✓', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setSavingPromptModal(false);
    }
  };

  const filteredPublished =
    filter === 'all'
      ? published
      : filter === 'top'
        ? published.filter((s) => s.score != null && s.score >= 7)
        : filter === 'low'
          ? published.filter((s) => s.score != null && s.score < 5)
          : published.filter((s) => s.score == null);

  const showGenerateButton = tab === 'proposals' && proposals.length < MAX_DRAFTS;

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre retour + titre projet */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-lg border transition-all border-[var(--sf-border)] hover:bg-[var(--sf-card-hover)]"
          style={{ color: 'var(--sf-text-muted)' }}
          aria-label="Retour au dashboard"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="sf-section-label">03 — Projet</p>
          {editingProjectName ? (
            <input
              ref={projectNameInputRef}
              type="text"
              value={projectNameEdit}
              onChange={(e) => setProjectNameEdit(e.target.value)}
              onBlur={handleSaveProjectName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') {
                  setProjectNameEdit(project.name);
                  setEditingProjectName(false);
                }
              }}
              disabled={savingProjectName}
              className="sf-heading-display w-full truncate bg-transparent border-b-2 border-[var(--sf-cta)] outline-none py-0.5"
              style={{ fontFamily: 'var(--sf-heading-font)', color: 'var(--sf-text)' }}
            />
          ) : (
            <h1
              className="sf-heading-display truncate cursor-text select-none"
              onDoubleClick={() => {
                setProjectNameEdit(project.name);
                setEditingProjectName(true);
              }}
              title="Double-clic pour modifier"
            >
              {project.name}
            </h1>
          )}
        </div>
      </div>

      {/* Switch Propositions / Sélection / En ligne */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border gap-2 p-1.5 border-[var(--sf-border)] bg-[var(--sf-card)]">
          <button
            type="button"
            onClick={() => setTab('proposals')}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === 'proposals' ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
            }`}
          >
            Propositions
          </button>
          <button
            type="button"
            onClick={() => setTab('selection')}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === 'selection' ? 'bg-[var(--sf-accent)] text-white' : 'text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
            }`}
          >
            Sélection
          </button>
          <button
            type="button"
            onClick={() => setTab('published')}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === 'published' ? 'bg-[var(--sf-success)] text-white' : 'text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
            }`}
          >
            En ligne
          </button>
        </div>
      </div>

      {tab === 'proposals' && (
        <>
          {showGenerateButton && (
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-[var(--sf-text-muted)] mb-1">
                  Décris ton SaaS / ton app (enregistré automatiquement)
                </label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setPromptEditValue(saasPrompt);
                    setSaasPromptModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPromptEditValue(saasPrompt);
                      setSaasPromptModalOpen(true);
                    }
                  }}
                  className="w-full min-h-[100px] px-4 py-3 rounded-lg border border-[var(--sf-border)] text-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--sf-cta)] focus:border-transparent overflow-hidden line-clamp-4 whitespace-pre-wrap"
                  style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
                >
                  {saasPrompt || (
                    <span style={{ color: 'var(--sf-text-dim)' }}>Colle ici un prompt qui décrit précisément ton produit : fonctionnalités, cible, bénéfices…</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={generating}
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--sf-cta)] font-medium hover:opacity-90 disabled:opacity-60 transition-all shrink-0"
              style={{ color: 'var(--sf-cta-text)' }}
              >
                {generating ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta-text)' }} />
                    Génération…
                  </>
                ) : (
                  <>Générer 7 scripts</>
                )}
              </button>
            </div>
          )}
          {proposals.length >= MAX_DRAFTS && (
            <p className="text-sm text-[var(--sf-text-dim)] text-center">
              Limite de 50 propositions. Supprime ou mets en ligne des scripts pour continuer.
            </p>
          )}

          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg bg-[var(--sf-card)]">
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Hook (2-4s)</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Contexte & Problème</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Démo & Preuve</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">CTA</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : proposals.length === 0 && !generating ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base text-[var(--sf-text-muted)] mb-2">Aucune proposition</p>
              <p className="text-sm text-[var(--sf-text-dim)]">Clique sur Générer 7 scripts pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generating && [1, 2, 3, 4, 5, 6, 7].map((i) => <SpeechCardSkeleton key={`skeleton-${i}`} />)}
              {proposals.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('[data-action]')) return;
                    navigate(`/dashboard/speech/${s.id}`, { state: { fromProject: projectId } });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.target.closest('[data-action]') && navigate(`/dashboard/speech/${s.id}`, { state: { fromProject: projectId } })}
                  className="rounded-xl border border-[var(--sf-border)] bg-[var(--sf-card)] hover:border-[var(--sf-cta)]/40 hover:bg-[var(--sf-card-hover)] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold text-[var(--sf-text)] line-clamp-3">{truncateLines(s.hook)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.context)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.demo)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.cta)}</div>
                  </div>
                    <div className="flex items-center justify-between px-4 py-0 border-t border-[var(--sf-border)] bg-[var(--sf-card-hover)]">
                    <span className="text-xs text-[var(--sf-text-dim)]">ID {toDisplayId(s.id)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSelection(s.id);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer text-[var(--sf-accent)] border-[var(--sf-accent)]/50 hover:bg-[var(--sf-accent)]/15"
                      >
                        Sélectionner
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/speech/${s.id}`, { state: { fromProject: projectId } });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded text-[var(--sf-text-dim)] hover:text-blue-400 hover:bg-[var(--sf-card-hover)] transition-colors"
                        title="Ouvrir l'interface complète (édition)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal(s);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded text-[var(--sf-text-dim)] hover:text-red-400 hover:bg-[var(--sf-card-hover)] transition-colors"
                        aria-label="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'selection' && (
        <>
          <p className="text-sm text-[var(--sf-text-muted)] text-center mb-2">
            Propositions en sélection pour revoir ou modifier avant mise en ligne.
          </p>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg bg-[var(--sf-card)]">
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Hook (2-4s)</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Contexte & Problème</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Démo & Preuve</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">CTA</div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : selected.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base text-[var(--sf-text-muted)] mb-2">Aucune proposition en sélection</p>
              <p className="text-sm text-[var(--sf-text-dim)]">Ouvre une proposition et clique sur « Mettre en sélection »</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selected.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('[data-action]')) return;
                    openQuickEdit(s);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.target.closest('[data-action]')) openQuickEdit(s);
                  }}
                  className="rounded-xl border border-[var(--sf-border)] bg-[var(--sf-card)] hover:border-[var(--sf-cta)]/40 hover:bg-[var(--sf-card-hover)] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold text-[var(--sf-text)] line-clamp-3">{truncateLines(s.hook)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.context)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.demo)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-0 border-t border-[var(--sf-border)] bg-[var(--sf-card-hover)]">
                    <span className="text-xs text-[var(--sf-text-dim)]">ID {toDisplayId(s.id)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublishFromSelection(s.id);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer text-blue-400 border-blue-500/50 hover:bg-blue-500/20"
                      >
                        Mettre en ligne
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/speech/${s.id}`, { state: { fromProject: projectId, returnTab: 'selection' } });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded text-[var(--sf-text-dim)] hover:text-blue-400 hover:bg-[var(--sf-card-hover)] transition-colors"
                        title="Ouvrir l'interface complète (cartés réseaux et édition)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectionActionItem(s);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded text-[var(--sf-text-dim)] hover:text-red-400 hover:bg-[var(--sf-card-hover)] transition-colors"
                        title="Options"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modale édition rapide (Sélection) */}
      {quickEditItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-edit-title"
          onClick={() => !quickEditSaving && setQuickEditItem(null)}
        >
          <div
            className="w-full max-w-7xl h-[90vh] flex flex-col rounded-xl border border-[var(--sf-border)] bg-[var(--sf-card)] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="quick-edit-title" className="text-lg font-semibold text-[var(--sf-text)] px-6 py-4 border-b border-[var(--sf-border)] shrink-0">
              Modifier la proposition
            </h2>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-hook" className="block text-xs font-medium text-[var(--sf-text-muted)] mb-1">Hook (2-4s)</label>
                <textarea
                  id="qe-hook"
                  value={editForm.hook}
                  onChange={(e) => setEditForm((f) => ({ ...f, hook: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg border border-[var(--sf-border)] text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[var(--sf-cta)] focus:border-transparent"
                  style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-context" className="block text-xs font-medium text-[var(--sf-text-muted)] mb-1">Contexte & Problème</label>
                <textarea
                  id="qe-context"
                  value={editForm.context}
                  onChange={(e) => setEditForm((f) => ({ ...f, context: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg border border-[var(--sf-border)] text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[var(--sf-cta)] focus:border-transparent"
                  style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-demo" className="block text-xs font-medium text-[var(--sf-text-muted)] mb-1">Démo & Preuve</label>
                <textarea
                  id="qe-demo"
                  value={editForm.demo}
                  onChange={(e) => setEditForm((f) => ({ ...f, demo: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg border border-[var(--sf-border)] text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[var(--sf-cta)] focus:border-transparent"
                  style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-cta" className="block text-xs font-medium text-[var(--sf-text-muted)] mb-1">CTA</label>
                <textarea
                  id="qe-cta"
                  value={editForm.cta}
                  onChange={(e) => setEditForm((f) => ({ ...f, cta: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg border border-[var(--sf-border)] text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[var(--sf-cta)] focus:border-transparent"
                  style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6 pt-4 border-t border-[var(--sf-border)] shrink-0">
              <button
                type="button"
                onClick={() => !quickEditSaving && setQuickEditItem(null)}
                disabled={quickEditSaving}
                className="px-4 py-2.5 rounded-lg border border-[var(--sf-border)] text-[var(--sf-text-muted)] font-medium hover:bg-[var(--sf-card-hover)] hover:text-[var(--sf-text)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                Annuler
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleQuickEditSave}
                  disabled={quickEditSaving}
                  className="px-5 py-2.5 rounded-lg bg-[#2563eb] text-white font-medium hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {quickEditSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={handleQuickEditPublish}
                  disabled={quickEditSaving}
                  className="px-5 py-2.5 rounded-lg bg-[var(--sf-cta)] font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  style={{ color: 'var(--sf-cta-text)' }}
                >
                  Mettre en ligne
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale plein écran : Décris ton SaaS / ton app */}
      {saasPromptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[var(--sf-bg)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saas-prompt-modal-title"
        >
          <h2 id="saas-prompt-modal-title" className="sr-only">
            Décris ton SaaS / ton app
          </h2>
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border overflow-hidden border-[var(--sf-border)]" style={{ backgroundColor: 'var(--sf-card)' }}>
              <div className="px-4 py-3 border-b border-[var(--sf-border)] shrink-0">
                <p className="text-sm font-medium" style={{ color: 'var(--sf-text-muted)' }}>
                  Décris ton SaaS / ton app (enregistré automatiquement)
                </p>
              </div>
              <div className="flex-1 min-h-0 p-4 overflow-hidden">
                <textarea
                  value={promptEditValue}
                  onChange={(e) => setPromptEditValue(e.target.value)}
                  placeholder="Colle ici un prompt qui décrit précisément ton produit : fonctionnalités, cible, bénéfices…"
                  className="w-full h-full min-h-0 px-4 py-3 rounded-lg border border-[var(--sf-border)] text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[var(--sf-cta)] focus:border-transparent"
                  style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-4 border-t border-[var(--sf-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => !savingPromptModal && setSaasPromptModalOpen(false)}
                  disabled={savingPromptModal}
                  className="px-4 py-2.5 rounded-lg border font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-[var(--sf-border)] hover:bg-[var(--sf-card-hover)] hover:text-[var(--sf-text)]"
                  style={{ color: 'var(--sf-text-muted)' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSavePromptModal}
                  disabled={savingPromptModal}
                  className="px-5 py-2.5 rounded-lg bg-[var(--sf-cta)] font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  style={{ color: 'var(--sf-cta-text)' }}
                >
                  {savingPromptModal ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale actions (× sur une proposition en sélection) */}
      {selectionActionItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="selection-action-title"
          onClick={() => !selectionActionLoading && setSelectionActionItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--sf-border)] bg-[var(--sf-card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="selection-action-title" className="text-lg font-bold text-[var(--sf-text)] mb-2">Que faire ?</h2>
            <p className="text-sm text-[var(--sf-text-muted)] mb-4">Supprimer définitivement, enlever de la sélection ou annuler.</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={selectionActionLoading}
                onClick={() => handleSelectionAction('delete')}
                className="w-full px-4 py-2.5 rounded-lg bg-red-600/20 text-red-400 font-medium hover:bg-red-600/30 transition-colors disabled:opacity-60"
              >
                Supprimer définitivement
              </button>
              <button
                type="button"
                disabled={selectionActionLoading}
                onClick={() => handleSelectionAction('remove')}
                className="w-full px-4 py-2.5 rounded-lg bg-[#2563eb]/20 text-[#60a5fa] font-medium hover:bg-[#2563eb]/30 transition-colors disabled:opacity-60"
              >
                Enlever de la sélection
              </button>
              <button
                type="button"
                disabled={selectionActionLoading}
                onClick={() => setSelectionActionItem(null)}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--sf-border)] text-[var(--sf-text-muted)] font-medium hover:bg-[var(--sf-card-hover)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'published' && (
        <>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'top', label: 'Top (7+)' },
              { id: 'low', label: 'À améliorer (<5)' },
              { id: 'unrated', label: 'Non notés' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  filter === f.id ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'bg-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)] hover:bg-[var(--sf-border-light)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg bg-[var(--sf-card)]">
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Hook</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Contexte</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">Démo</div>
            <div className="text-[13px] font-semibold text-[var(--sf-text-muted)]">CTA</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPublished.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base text-[var(--sf-text-muted)] mb-2">Aucun script en ligne</p>
              <p className="text-sm text-[var(--sf-text-dim)]">Mets des scripts en ligne depuis les propositions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPublished.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/speech/${s.id}`, { state: { fromProject: projectId } })}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/speech/${s.id}`, { state: { fromProject: projectId } })}
                  className="rounded-xl border border-[var(--sf-border)] bg-[var(--sf-card)] hover:border-[var(--sf-cta)]/40 overflow-hidden cursor-pointer transition-all"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold text-[var(--sf-text)] line-clamp-3">{truncateLines(s.hook)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.context)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.demo)}</div>
                    <div className="text-sm text-[var(--sf-text)] line-clamp-3">{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center px-4 py-0 border-t border-[var(--sf-border)] bg-[var(--sf-card-hover)]">
                    <span className="text-xs text-[var(--sf-text-dim)] shrink-0">ID {toDisplayId(s.id)}</span>
                    <span className="text-xs text-[var(--sf-text-dim)] flex-1 text-center">
                      Mis en ligne le {formatDate(s.published_at)}
                    </span>
                    <div className="flex gap-0.5 shrink-0">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={updatingScore === s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScoreChange(s.id, n);
                          }}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            s.score === n ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'bg-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--sf-border)] bg-[var(--sf-card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[var(--sf-text)] mb-2">Supprimer cette proposition ?</h2>
            <p className="text-sm text-[var(--sf-text-muted)] mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[var(--sf-border)] text-[var(--sf-text-muted)] hover:bg-[var(--sf-card-hover)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteModal.id)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-60"
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
