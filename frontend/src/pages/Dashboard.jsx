import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { generateProposals } from '../utils/speechApi';
import { useToast } from '../contexts/ToastContext';
import SpeechCardSkeleton from '../components/SpeechCardSkeleton';
import { toDisplayId } from '../utils/format';

const MAX_DRAFTS = 50;

function normalizeGeneratedText(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (s.includes('à compléter')) return '';
  return s;
}

function truncateLines(text, maxLines = 3) {
  if (!text) return '';
  const lines = text.split(/\n/).slice(0, maxLines);
  const joined = lines.join('\n');
  return joined.length < text.length ? `${joined}…` : joined;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Mélange aléatoire pour varier les références envoyées à l'API (limite la convergence). */
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Dashboard() {
  const location = useLocation();
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
  const [quickEditItem, setQuickEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ hook: '', context: '', demo: '', cta: '' });
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [selectionActionItem, setSelectionActionItem] = useState(null);
  const [selectionActionLoading, setSelectionActionLoading] = useState(false);
  const [publishedActionItem, setPublishedActionItem] = useState(null);
  const [publishedActionLoading, setPublishedActionLoading] = useState(false);
  const [movingToSelectionIds, setMovingToSelectionIds] = useState([]);
  const [movingToPublishedIds, setMovingToPublishedIds] = useState([]);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchSpeeches = useCallback(async () => {
    try {
      const { data } = await api.get('/api/speeches');
      const rawList = data.speeches || [];
      const list = rawList.map((s) => ({
        ...s,
        hook: normalizeGeneratedText(s.hook),
        context: normalizeGeneratedText(s.context),
        demo: normalizeGeneratedText(s.demo),
        cta: normalizeGeneratedText(s.cta),
      }));
      setProposals(list.filter((s) => s.status === 'draft' && !s.in_selection));
      setSelected(list.filter((s) => s.status === 'draft' && s.in_selection));
      setPublished(list.filter((s) => s.status === 'published'));
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSpeeches();
  }, [fetchSpeeches]);

  const handleGenerate = async () => {
    const count = proposals.length;
    if (count >= MAX_DRAFTS) {
      addToast(`Tu as atteint la limite de ${MAX_DRAFTS} propositions. Supprime ou mets en ligne des scripts pour continuer.`, 'error');
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

      const topFiltered = published.filter((s) => s.score != null && s.score >= 7);
      const topSummary = shuffle(topFiltered)
        .slice(0, 15)
        .map((s) => {
          const scorePart = s.score != null ? ` [Score: ${s.score}]` : '';
          return `--- Script top${scorePart} ---\nHook: ${s.hook || ''}\nContexte: ${(s.context || '').slice(0, 250)}\nDémo: ${(s.demo || '').slice(0, 250)}\nCTA: ${s.cta || ''}`;
        })
        .join('\n\n');
      const selectionSummary = shuffle(selected)
        .slice(0, 15)
        .map((s) => `--- Script en sélection ---\nHook: ${s.hook || ''}\nContexte: ${(s.context || '').slice(0, 250)}\nDémo: ${(s.demo || '').slice(0, 250)}\nCTA: ${s.cta || ''}`)
        .join('\n\n');
      const scripts = await generateProposals(existingSummary, topSummary, selectionSummary, saasPrompt);
      const toInsert = scripts.slice(0, MAX_DRAFTS - count).map((s) => ({
        hook: s.hook || '',
        hook_type: s.hook_type || null,
        context: s.context || '',
        demo: s.demo || '',
        cta: s.cta || '',
        pillar: s.pillar || null,
      }));
      await api.post('/api/speeches', { speeches: toInsert });
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
      setPublished((prev) => prev.filter((s) => s.id !== id));
      setDeleteModal(null);
      addToast('Script supprimé', 'info');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddToSelection = async (id) => {
    const item = proposals.find((s) => s.id === id);
    if (!item) return;

    setMovingToSelectionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    // Animation de sortie puis déplacement entre Propositions et Sélection
    setTimeout(() => {
      setProposals((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => {
        if (prev.some((s) => s.id === id)) return prev;
        return [...prev, { ...item, in_selection: true }];
      });
      setMovingToSelectionIds((prev) => prev.filter((movingId) => movingId !== id));
    }, 200);

    try {
      await api.put(`/api/speeches/${id}`, { in_selection: true });
      addToast('Ajouté à la sélection', 'success');
    } catch (err) {
      console.error("Erreur lors de l'ajout en sélection:", err);
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
      try {
        await fetchSpeeches();
      } catch (reloadError) {
        console.error('Erreur lors du rechargement des scripts:', reloadError);
      }
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

  const handlePublishFromSelection = async (id) => {
    const source = [...proposals, ...selected].find((s) => s.id === id);
    if (!source) return;

    const publishedAt = new Date().toISOString();
    const updated = {
      ...source,
      status: 'published',
      published_at: publishedAt,
      in_selection: false,
    };

    setMovingToPublishedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    // Animation de sortie puis déplacement entre Sélection et En ligne
    setTimeout(() => {
      setSelected((prev) => prev.filter((s) => s.id !== id));
      setProposals((prev) => prev.filter((s) => s.id !== id));
      setPublished((prev) => [updated, ...prev.filter((s) => s.id !== id)]);
      setMovingToPublishedIds((prev) => prev.filter((movingId) => movingId !== id));
    }, 200);

    try {
      await api.put(`/api/speeches/${id}`, {
        status: 'published',
        published_at: publishedAt,
        in_selection: false,
      });
      addToast('Script mis en ligne ✓', 'success');
    } catch (err) {
      console.error('Erreur lors de la mise en ligne:', err);
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
      try {
        await fetchSpeeches();
      } catch (reloadError) {
        console.error('Erreur lors du rechargement des scripts:', reloadError);
      }
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
        setProposals((prev) => {
          const exists = prev.some((s) => s.id === item.id);
          if (exists) {
            return prev.map((s) => (s.id === item.id ? { ...s, in_selection: false } : s));
          }
          return [...prev, { ...item, in_selection: false }];
        });
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

  const handlePublishedAction = async (action) => {
    const item = publishedActionItem;
    if (!item) return;
    setPublishedActionLoading(true);
    try {
      if (action === 'unpublish') {
        await api.put(`/api/speeches/${item.id}`, {
          status: 'draft',
          in_selection: false,
          published_at: null,
        });
        setPublished((prev) => prev.filter((s) => s.id !== item.id));
        setProposals((prev) => {
          const exists = prev.some((s) => s.id === item.id);
          if (exists) {
            return prev.map((s) => (s.id === item.id ? { ...s, status: 'draft', in_selection: false, published_at: null } : s));
          }
          return [{ ...item, status: 'draft', in_selection: false, published_at: null }, ...prev];
        });
        addToast('Script retiré des mises en ligne', 'info');
      } else if (action === 'delete') {
        await api.delete(`/api/speeches/${item.id}`);
        setPublished((prev) => prev.filter((s) => s.id !== item.id));
        setProposals((prev) => prev.filter((s) => s.id !== item.id));
        setSelected((prev) => prev.filter((s) => s.id !== item.id));
        addToast('Script supprimé définitivement', 'info');
      }
      setPublishedActionItem(null);
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setPublishedActionLoading(false);
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

  return (
    <div className="space-y-8">
      <section className="mb-8">
        <p className="sf-section-label">02 — Scripts</p>
        <h1 className="sf-heading-display">Propositions & scripts</h1>
        <p className="sf-subtitle-bracket mt-2">(génère, sélectionne, mets en ligne)</p>
      </section>

      {/* Switch Propositions / Sélection / En ligne */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg gap-2 p-1.5 bg-[var(--sf-card)]">
          <button
            type="button"
            onClick={() => setTab('proposals')}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'proposals' ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
            }`}
          >
            Propositions
          </button>
          <button
            type="button"
            onClick={() => setTab('selection')}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'selection' ? 'bg-[var(--sf-accent)] text-white' : 'text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
            }`}
          >
            Sélection
          </button>
          <button
            type="button"
            onClick={() => setTab('published')}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
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
                <label htmlFor="saas-prompt" className="block text-xs font-medium mb-1" style={{ color: 'var(--sf-text-muted)' }}>
                  Décris ton SaaS / ton app (optionnel)
                </label>
                <textarea
                  id="saas-prompt"
                  placeholder="Colle ici un prompt qui décrit précisément ton produit : fonctionnalités, cible, bénéfices, différenciation… Les scripts générés s’appuieront sur ce contexte."
                  value={saasPrompt}
                  onChange={(e) => setSaasPrompt(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 sf-input"
                />
              </div>
              <button
                type="button"
                disabled={generating}
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shrink-0 sf-cta-button bg-[var(--sf-cta)] text-[var(--sf-cta-text)] hover:opacity-90"
              >
                {generating ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Génération…
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Générer 7 scripts
                  </>
                )}
              </button>
            </div>
          )}
          {proposals.length >= MAX_DRAFTS && (
            <p className="text-sm text-center" style={{ color: 'var(--sf-text-muted)' }}>
              Tu as atteint la limite de 50 propositions. Supprime ou mets en ligne des scripts pour continuer.
            </p>
          )}

          {/* En-tête colonnes — même structure que En ligne */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--sf-surface-alt)' }}>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>
              Hook (2-4s)
              <div className="text-[11px] font-normal" style={{ color: 'var(--sf-text-dim)' }}>services uniquement</div>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>
              Contexte & Problème
              <div className="text-[11px] font-normal" style={{ color: 'var(--sf-text-dim)' }}>élaboré</div>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>
              Démo & Preuve
              <div className="text-[11px] font-normal" style={{ color: 'var(--sf-text-dim)' }}>détaillée</div>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>
              CTA
              <div className="text-[11px] font-normal" style={{ color: 'var(--sf-text-dim)' }}>25-60s total</div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : proposals.length === 0 && !generating ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-dim)' }}>
                📄
              </div>
              <p className="text-base mb-2" style={{ color: 'var(--sf-text-muted)' }}>Aucune proposition pour l'instant</p>
              <p className="text-sm" style={{ color: 'var(--sf-text-dim)' }}>Clique sur Générer 7 scripts pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generating && (
                <>
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <SpeechCardSkeleton key={`skeleton-${i}`} />
                  ))}
                </>
              )}
              {proposals.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('[data-action]')) return;
                    navigate(`/dashboard/speech/${s.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.target.closest('[data-action]')) {
                      navigate(`/dashboard/speech/${s.id}`);
                    }
                  }}
                  className={`rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden sf-card-style hover:border-[var(--sf-accent)]/30 ${
                    movingToSelectionIds.includes(s.id) ? 'opacity-0 translate-y-1 scale-[0.98]' : 'opacity-100'
                  }`}
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.hook)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.context)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.demo)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-0 border-t" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}>
                    <span className="text-xs" style={{ color: 'var(--sf-text-dim)' }}>ID {toDisplayId(s.id)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSelection(s.id);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors duration-200 cursor-pointer text-[var(--sf-accent)] border-[var(--sf-accent)]/50 hover:bg-[var(--sf-accent)]/15"
                      >
                        Sélectionner
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/speech/${s.id}`);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded transition-colors duration-200"
                        style={{ color: 'var(--sf-text-dim)' }}
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
                        className="w-8 h-8 flex items-center justify-center rounded transition-colors duration-200 hover:opacity-80"
                        style={{ color: 'var(--sf-text-dim)' }}
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
          <p className="text-sm text-center mb-2" style={{ color: 'var(--sf-text-muted)' }}>
            Propositions que tu as mises en sélection pour revoir ou modifier avant mise en ligne.
          </p>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--sf-surface-alt)' }}>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>Hook (2-4s)</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>Contexte & Problème</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>Démo & Preuve</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>CTA</div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : selected.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-dim)' }}>
                📋
              </div>
              <p className="text-base mb-2" style={{ color: 'var(--sf-text-muted)' }}>Aucune proposition en sélection</p>
              <p className="text-sm" style={{ color: 'var(--sf-text-dim)' }}>Depuis Propositions, ouvre une proposition et clique sur « Mettre en sélection »</p>
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
                  className={`rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden sf-card-style hover:border-[var(--sf-accent)]/30 ${
                    movingToPublishedIds.includes(s.id) ? 'opacity-0 translate-y-1 scale-[0.98]' : 'opacity-100'
                  }`}
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.hook)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.context)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.demo)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-0 border-t" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}>
                    <span className="text-xs" style={{ color: 'var(--sf-text-dim)' }}>ID {toDisplayId(s.id)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublishFromSelection(s.id);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors duration-200 cursor-pointer"
                    style={{ color: 'var(--sf-cta)', borderColor: 'var(--sf-cta)' }}
                      >
                        Mettre en ligne
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/speech/${s.id}`, { state: { returnTab: 'selection' } });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded transition-colors duration-200"
                        style={{ color: 'var(--sf-text-dim)' }}
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
                        className="w-8 h-8 flex items-center justify-center rounded transition-colors duration-200 hover:opacity-80"
                        style={{ color: 'var(--sf-text-dim)' }}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-edit-title"
          onClick={() => !quickEditSaving && setQuickEditItem(null)}
        >
          <div
            className="w-full max-w-7xl h-[90vh] flex flex-col rounded-xl shadow-xl overflow-hidden sf-card-style"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="quick-edit-title" className="text-lg font-semibold px-6 py-4 border-b shrink-0" style={{ color: 'var(--sf-text)', borderColor: 'var(--sf-border)' }}>
              Modifier la proposition
            </h2>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-hook" className="block text-xs font-medium mb-1" style={{ color: 'var(--sf-text-muted)' }}>Hook (2-4s)</label>
                <textarea
                  id="qe-hook"
                  value={editForm.hook}
                  onChange={(e) => setEditForm((f) => ({ ...f, hook: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg text-sm resize-none overflow-y-auto no-scrollbar sf-input"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-context" className="block text-xs font-medium mb-1" style={{ color: 'var(--sf-text-muted)' }}>Contexte & Problème</label>
                <textarea
                  id="qe-context"
                  value={editForm.context}
                  onChange={(e) => setEditForm((f) => ({ ...f, context: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg text-sm resize-none overflow-y-auto no-scrollbar sf-input"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-demo" className="block text-xs font-medium mb-1" style={{ color: 'var(--sf-text-muted)' }}>Démo & Preuve</label>
                <textarea
                  id="qe-demo"
                  value={editForm.demo}
                  onChange={(e) => setEditForm((f) => ({ ...f, demo: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg text-sm resize-none overflow-y-auto no-scrollbar sf-input"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-cta" className="block text-xs font-medium mb-1" style={{ color: 'var(--sf-text-muted)' }}>CTA</label>
                <textarea
                  id="qe-cta"
                  value={editForm.cta}
                  onChange={(e) => setEditForm((f) => ({ ...f, cta: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg text-sm resize-none overflow-y-auto no-scrollbar sf-input"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6 pt-4 border-t shrink-0" style={{ borderColor: 'var(--sf-border)' }}>
              <button
                type="button"
                onClick={() => !quickEditSaving && setQuickEditItem(null)}
                disabled={quickEditSaving}
                className="px-4 py-2.5 rounded-lg border font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
              >
                Annuler
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleQuickEditSave}
                  disabled={quickEditSaving}
                  className="px-5 py-2.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer bg-[var(--sf-cta)] text-[var(--sf-cta-text)] hover:opacity-90"
                >
                  {quickEditSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={handleQuickEditPublish}
                  disabled={quickEditSaving}
                  className="px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors bg-[var(--sf-cta)] cursor-pointer"
                  style={{ color: 'var(--sf-cta-text)' }}
                >
                  Mettre en ligne
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
            className="w-full max-w-sm rounded-xl p-6 shadow-xl sf-card-style"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="selection-action-title" className="text-lg font-bold mb-2" style={{ color: 'var(--sf-text)' }}>
              Que faire ?
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--sf-text-muted)' }}>
              Enlever de la sélection, supprimer définitivement ou annuler.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={selectionActionLoading}
                onClick={() => handleSelectionAction('remove')}
                className="w-full px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--sf-accent-soft)', color: 'var(--sf-cta)' }}
              >
                Enlever de la sélection
              </button>
              <button
                type="button"
                disabled={selectionActionLoading}
                onClick={() => handleSelectionAction('delete')}
                className="w-full px-4 py-2.5 rounded-lg font-medium text-center transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: 'var(--sf-danger)' }}
              >
                Supprimer définitivement
              </button>
              <button
                type="button"
                disabled={selectionActionLoading}
                onClick={() => setSelectionActionItem(null)}
                className="w-full px-4 py-2.5 rounded-lg border font-medium transition-colors"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'published' && (
        <>
          {/* Filtres */}
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                  filter === f.id ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'bg-[var(--sf-surface-alt)] hover:bg-[var(--sf-border)]'
                }`}
                style={filter !== f.id ? { color: 'var(--sf-text-muted)' } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* En-tête colonnes (même structure) */}
          <div
            className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg border"
            style={{ backgroundColor: 'var(--sf-surface-alt)', borderColor: 'var(--sf-success)' }}
          >
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>Hook (2-4s)</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>Contexte & Problème</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>Démo & Preuve</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--sf-text-muted)' }}>CTA</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPublished.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-dim)' }}>
                🚀
              </div>
              <p className="text-base mb-2" style={{ color: 'var(--sf-text-muted)' }}>Aucun script en ligne</p>
              <p className="text-sm" style={{ color: 'var(--sf-text-dim)' }}>Tes scripts apparaîtront ici quand tu les mettras en ligne</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPublished.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('[data-action]')) return;
                    navigate(`/dashboard/speech/${s.id}`);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/speech/${s.id}`)}
                  className="rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden sf-card-style hover:border-[var(--sf-success)]"
                  style={{ borderColor: 'var(--sf-success)' }}
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.hook)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.context)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.demo)}</div>
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--sf-text)' }}>{truncateLines(s.cta)}</div>
                  </div>
                  <div
                    className="flex items-center px-4 py-3 border-t"
                    style={{ borderColor: 'var(--sf-success)', backgroundColor: 'var(--sf-card)' }}
                  >
                    <span className="text-xs shrink-0" style={{ color: 'var(--sf-text-dim)' }}>ID {toDisplayId(s.id)}</span>
                    <span className="text-xs flex-1 text-center" style={{ color: 'var(--sf-text-dim)' }}>
                      Mis en ligne le {formatDate(s.published_at)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.score != null ? (
                        <div className="flex gap-0.5">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <button
                              key={n}
                              type="button"
                              disabled={updatingScore === s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScoreChange(s.id, n);
                              }}
                              className={`w-7 h-7 rounded-full text-xs font-medium transition-all duration-200 ${
                                s.score === n
                                  ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]'
                                  : 'bg-[var(--sf-surface-alt)] hover:opacity-80'
                              }`}
                              style={s.score !== n ? { color: 'var(--sf-text-muted)' } : {}}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic" style={{ color: 'var(--sf-text-dim)' }}>Non noté</span>
                      )}
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          setPublishedActionItem(s);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors duration-200 cursor-pointer"
                        style={{ color: 'var(--sf-text-dim)', borderColor: 'var(--sf-border)' }}
                        aria-label="Options de suppression"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modale actions (bouton Supprimer sur un script en ligne) */}
      {publishedActionItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="published-action-title"
          onClick={() => !publishedActionLoading && setPublishedActionItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 shadow-xl sf-card-style"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="published-action-title" className="text-lg font-bold mb-2" style={{ color: 'var(--sf-text)' }}>
              Que faire ?
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--sf-text-muted)' }}>
              Enlever des mises en ligne, supprimer définitivement ou annuler.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={publishedActionLoading}
                onClick={() => handlePublishedAction('unpublish')}
                className="w-full px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--sf-accent-soft)', color: 'var(--sf-cta)' }}
              >
                Enlever des mises en ligne
              </button>
              <button
                type="button"
                disabled={publishedActionLoading}
                onClick={() => handlePublishedAction('delete')}
                className="w-full px-4 py-2.5 rounded-lg font-medium text-center transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: 'var(--sf-danger)' }}
              >
                Supprimer définitivement
              </button>
              <button
                type="button"
                disabled={publishedActionLoading}
                onClick={() => setPublishedActionItem(null)}
                className="w-full px-4 py-2.5 rounded-lg border font-medium transition-colors"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale suppression */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-xl sf-card-style"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-modal-title" className="text-lg font-bold mb-2" style={{ color: 'var(--sf-text)' }}>
              Supprimer cette proposition ?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--sf-text-muted)' }}>Cette action est irréversible.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border transition-colors duration-200"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteModal.id)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-colors duration-200 bg-[var(--sf-danger)] text-white"
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
