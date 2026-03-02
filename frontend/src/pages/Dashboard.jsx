import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { generateProposals } from '../utils/speechApi';
import { useToast } from '../contexts/ToastContext';
import SpeechCardSkeleton from '../components/SpeechCardSkeleton';

const MAX_DRAFTS = 50;

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
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchSpeeches = useCallback(async () => {
    try {
      const { data } = await api.get('/api/speeches');
      const list = data.speeches || [];
      setProposals(list.filter((s) => s.status === 'draft'));
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
        <div className="inline-flex rounded-lg border gap-2 p-1.5 border-[var(--sf-border)] bg-[var(--sf-card)]">
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
                <label htmlFor="saas-prompt" className="block text-xs font-medium text-[#94a3b8] mb-1">
                  Décris ton SaaS / ton app (optionnel)
                </label>
                <textarea
                  id="saas-prompt"
                  placeholder="Colle ici un prompt qui décrit précisément ton produit : fonctionnalités, cible, bénéfices, différenciation… Les scripts générés s’appuieront sur ce contexte."
                  value={saasPrompt}
                  onChange={(e) => setSaasPrompt(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#1a1d27] border border-[#2a2d37] text-white placeholder-[#64748b] text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200"
                />
              </div>
              <button
                type="button"
                disabled={generating}
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563eb] text-white font-medium hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
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
            <p className="text-sm text-[#94a3b8] text-center">
              Tu as atteint la limite de 50 propositions. Supprime ou mets en ligne des scripts pour continuer.
            </p>
          )}

          {/* En-tête colonnes — même structure que En ligne */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg bg-[#1e2130]">
            <div className="text-[13px] font-semibold text-[#94a3b8]">
              Hook (2-4s)
              <div className="text-[11px] font-normal text-[#64748b]">services uniquement</div>
            </div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">
              Contexte & Problème
              <div className="text-[11px] font-normal text-[#64748b]">élaboré</div>
            </div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">
              Démo & Preuve
              <div className="text-[11px] font-normal text-[#64748b]">détaillée</div>
            </div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">
              CTA
              <div className="text-[11px] font-normal text-[#64748b]">25-60s total</div>
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
              <div className="w-12 h-12 rounded-full bg-[#2a2d37] flex items-center justify-center text-[#64748b] text-2xl mb-4">
                📄
              </div>
              <p className="text-base text-[#94a3b8] mb-2">Aucune proposition pour l'instant</p>
              <p className="text-sm text-[#64748b]">Clique sur Générer 7 scripts pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
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
                  className="rounded-xl border border-[#2a2d37] bg-[#1a1d27] hover:bg-[#222638] cursor-pointer transition-all duration-200 overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold text-[#f1f5f9] line-clamp-3">{truncateLines(s.hook)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.context)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.demo)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d37] bg-[#1a1d27]/80">
                    <span className="text-xs text-[#64748b]">ID {s.id}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/speech/${s.id}`);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#2a2d37] transition-colors duration-200"
                      >
                        Édition
                      </button>
                      <button
                        type="button"
                        data-action
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal(s);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#2a2d37] transition-colors duration-200"
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
          <p className="text-sm text-[#94a3b8] text-center mb-2">
            Propositions que tu as mises en sélection pour revoir ou modifier avant mise en ligne.
          </p>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg bg-[#1e2130]">
            <div className="text-[13px] font-semibold text-[#94a3b8]">Hook (2-4s)</div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">Contexte & Problème</div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">Démo & Preuve</div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">CTA</div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : selected.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#2a2d37] flex items-center justify-center text-[#64748b] text-2xl mb-4">
                📋
              </div>
              <p className="text-base text-[#94a3b8] mb-2">Aucune proposition en sélection</p>
              <p className="text-sm text-[#64748b]">Depuis Propositions, ouvre une proposition et clique sur « Mettre en sélection »</p>
            </div>
          ) : (
            <div className="space-y-2">
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
                  className="rounded-xl border border-[#2a2d37] bg-[#1a1d27] hover:bg-[#222638] cursor-pointer transition-all duration-200 overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold text-[#f1f5f9] line-clamp-3">{truncateLines(s.hook)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.context)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.demo)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d37] bg-[#1a1d27]/80">
                    <span className="text-xs text-[#64748b]">ID {s.id}</span>
                    <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-action
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/speech/${s.id}`, { state: { returnTab: 'selection' } });
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded text-[#64748b] hover:text-[#2563eb] hover:bg-[#2a2d37] transition-colors duration-200"
                      title="Ouvrir l’interface complète (cartés réseaux et édition)"
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
                      className="w-8 h-8 flex items-center justify-center rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#2a2d37] transition-colors duration-200"
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
            className="w-full max-w-7xl h-[90vh] flex flex-col rounded-xl bg-[#1a1d27] border border-[#2a2d37] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="quick-edit-title" className="text-lg font-semibold text-white px-6 py-4 border-b border-[#2a2d37] shrink-0">
              Modifier la proposition
            </h2>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-hook" className="block text-xs font-medium text-[#94a3b8] mb-1">Hook (2-4s)</label>
                <textarea
                  id="qe-hook"
                  value={editForm.hook}
                  onChange={(e) => setEditForm((f) => ({ ...f, hook: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2d37] text-white text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-context" className="block text-xs font-medium text-[#94a3b8] mb-1">Contexte & Problème</label>
                <textarea
                  id="qe-context"
                  value={editForm.context}
                  onChange={(e) => setEditForm((f) => ({ ...f, context: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2d37] text-white text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-demo" className="block text-xs font-medium text-[#94a3b8] mb-1">Démo & Preuve</label>
                <textarea
                  id="qe-demo"
                  value={editForm.demo}
                  onChange={(e) => setEditForm((f) => ({ ...f, demo: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2d37] text-white text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <label htmlFor="qe-cta" className="block text-xs font-medium text-[#94a3b8] mb-1">CTA</label>
                <textarea
                  id="qe-cta"
                  value={editForm.cta}
                  onChange={(e) => setEditForm((f) => ({ ...f, cta: e.target.value }))}
                  rows={12}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2d37] text-white text-sm resize-none overflow-y-auto no-scrollbar focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6 pt-4 border-t border-[#2a2d37] shrink-0">
              <button
                type="button"
                onClick={() => !quickEditSaving && setQuickEditItem(null)}
                disabled={quickEditSaving}
                className="px-4 py-2.5 rounded-lg border border-[#2a2d37] text-[#94a3b8] font-medium hover:bg-[#2a2d37] hover:text-white transition-colors disabled:opacity-60"
              >
                Annuler
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleQuickEditSave}
                  disabled={quickEditSaving}
                  className="px-5 py-2.5 rounded-lg bg-[#2563eb] text-white font-medium hover:bg-blue-600 disabled:opacity-60 transition-colors"
                >
                  {quickEditSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={handleQuickEditPublish}
                  disabled={quickEditSaving}
                  className="px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-colors bg-[var(--sf-cta)]"
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
            className="w-full max-w-sm rounded-xl bg-[#1a1d27] border border-[#2a2d37] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="selection-action-title" className="text-lg font-bold text-white mb-2">Que faire ?</h2>
            <p className="text-sm text-[#94a3b8] mb-4">Supprimer définitivement, enlever de la sélection ou annuler.</p>
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
                className="w-full px-4 py-2.5 rounded-lg border border-[#2a2d37] text-[#94a3b8] font-medium hover:bg-[#2a2d37] transition-colors"
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filter === f.id ? 'bg-[#2563eb] text-white' : 'bg-[#2a2d37] text-[#94a3b8] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* En-tête colonnes (même structure) */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 rounded-lg bg-[#1e2130]">
            <div className="text-[13px] font-semibold text-[#94a3b8]">Hook (2-4s)</div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">Contexte & Problème</div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">Démo & Preuve</div>
            <div className="text-[13px] font-semibold text-[#94a3b8]">CTA</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SpeechCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPublished.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#2a2d37] flex items-center justify-center text-[#64748b] text-2xl mb-4">
                🚀
              </div>
              <p className="text-base text-[#94a3b8] mb-2">Aucun script en ligne</p>
              <p className="text-sm text-[#64748b]">Tes scripts apparaîtront ici quand tu les mettras en ligne</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPublished.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('[data-delete]')) return;
                    navigate(`/dashboard/speech/${s.id}`);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/speech/${s.id}`)}
                  className="rounded-xl border border-[#2a2d37] bg-[#1a1d27] hover:bg-[#222638] cursor-pointer transition-all duration-200 overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-4">
                    <div className="text-sm font-semibold text-[#f1f5f9] line-clamp-3">{truncateLines(s.hook)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.context)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.demo)}</div>
                    <div className="text-sm text-[#f1f5f9] line-clamp-3">{truncateLines(s.cta)}</div>
                  </div>
                  <div className="flex items-center px-4 py-3 border-t border-[#2a2d37] bg-[#1a1d27]/80">
                    <span className="text-xs text-[#64748b] shrink-0">ID {s.id}</span>
                    <span className="text-xs text-[#64748b] flex-1 text-center">
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
                                  ? 'bg-[#2563eb] text-white'
                                  : 'bg-[#2a2d37] text-[#94a3b8] hover:text-white'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-[#64748b]">Non noté</span>
                      )}
                      <button
                        type="button"
                        data-delete
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal(s);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#2a2d37] transition-colors duration-200"
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
            className="w-full max-w-md rounded-xl bg-[#1a1d27] border border-[#2a2d37] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-modal-title" className="text-lg font-bold text-white mb-2">
              Supprimer cette proposition ?
            </h2>
            <p className="text-sm text-[#94a3b8] mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[#2a2d37] text-[#94a3b8] hover:bg-[#2a2d37] transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteModal.id)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-[#dc2626] text-white font-medium hover:bg-red-700 disabled:opacity-60 transition-colors duration-200"
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
