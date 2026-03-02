import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../utils/api';

const BODY_SCROLLBAR_CLASS = 'sf-page-hide-scrollbar';
import { generatePlatforms, regenerate } from '../utils/speechApi';
import { useToast } from '../contexts/ToastContext';
import CopyIcon from '../components/CopyIcon';

const PLATFORM_LABELS = {
  tiktok: { name: 'TikTok', bestTime: 'Mercredi - Vendredi, 14h - 21h', gradient: 'from-black to-[#00f2ea]', border: 'border-cyan-400/40', header: 'bg-black/80 text-cyan-300' },
  instagram: { name: 'Instagram Reels', bestTime: 'Mardi - Vendredi, 15h - 21h', gradient: 'from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', border: 'border-pink-400/40', header: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white' },
  youtube: { name: 'YouTube Shorts', bestTime: 'Mercredi - Jeudi, 16h', gradient: 'from-[#FF0000]', border: 'border-red-500/40', header: 'bg-[#FF0000] text-white' },
  linkedin: { name: 'LinkedIn', bestTime: 'Mardi - Jeudi, 7h - 11h', gradient: 'from-[#0A66C2]', border: 'border-[#0A66C2]/60', header: 'bg-[#0A66C2] text-white' },
  twitter: { name: 'X (Twitter)', bestTime: 'Mardi - Jeudi, 9h - 12h ou 17h - 21h', gradient: 'from-black', border: 'border-slate-500/40', header: 'bg-black text-white' },
};

/** Indications affichées dans les cartes quand les contenus plateformes n'ont pas encore été générés (sans consommer de crédit IA). */
const PLATFORM_INDICATIONS = {
  tiktok: {
    description: 'Description courte type légende : accroche directe, ton naturel, 1-2 phrases max.',
    how: 'Reprends le hook du script en tête, ajoute un CTA clair et 3-5 hashtags tendance.',
    tips: 'Évite les textes trop longs ; priorise l’impact en début de phrase. Meilleur moment : Mercredi–Vendredi 14h–21h.',
  },
  instagram: {
    description: 'Légende pour le Reel : contexte en 1-2 phrases, lien avec la démo, appel à l’action.',
    how: 'Aligne le texte avec le visuel ; première ligne = accroche (souvent masquée par « plus »).',
    tips: 'Hashtags en fin de post ou dans le 1er commentaire. Meilleur moment : Mardi–Vendredi 15h–21h.',
  },
  youtube: {
    description: 'Titre court et clair : mot-clé ou question qui reflète le sujet de la Short.',
    how: 'Pas de putaclic ; le titre doit décrire fidèlement le contenu pour garder la rétention.',
    tips: 'Max ~60 caractères visibles. Meilleur moment : Mercredi–Jeudi 16h.',
  },
  linkedin: {
    description: "Texte d'introduction professionnel : valeur ajoutée, chiffre ou question pour ouvrir.",
    how: 'Ton expert sans être trop commercial ; privilégie le conseil et l’insight.',
    tips: 'Évite les formules trop vendeuses en début de post. Meilleur moment : Mardi–Jeudi 7h–11h.',
  },
  twitter: {
    description: 'Tweet principal percutant ; ne jamais mettre le lien dans le tweet (pénalité algo).',
    how: 'Lien et CTA dans le 1er commentaire. Tu peux enchaîner en thread si le sujet le justifie.',
    tips: 'Restez sous la limite de caractères ; priorise clarté et punch. Meilleur moment : Mardi–Jeudi 9h–12h ou 17h–21h.',
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SpeechDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fromProject = location.state?.fromProject;
  const { addToast } = useToast();
  const [speech, setSpeech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(null);
  const [saving, setSaving] = useState(null);
  const [publishModal, setPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scoreUpdating, setScoreUpdating] = useState(false);
  const [ctaPlatform, setCtaPlatform] = useState(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add(BODY_SCROLLBAR_CLASS);
    return () => document.documentElement.classList.remove(BODY_SCROLLBAR_CLASS);
  }, []);

  /** Données plateformes déjà présentes en BDD — si false, on affiche les indications (pas de génération auto). */
  const hasPlatformData = speech && !loading && (() => {
    const keys = ['caption', 'title', 'tweet', 'intro_text', 'legende', 'cta', 'first_comment'];
    const platforms = ['tiktok', 'instagram', 'youtube', 'linkedin', 'twitter'];
    for (const p of platforms) {
      const d = speech[p];
      if (!d || typeof d !== 'object') continue;
      for (const k of keys) {
        const v = d[k];
        if (typeof v === 'string' && v.trim()) return true;
        if (Array.isArray(v) && v.length > 0) return true;
      }
      if (Object.keys(d).length > 0) {
        const anyContent = Object.values(d).some((v) => (typeof v === 'string' && v.trim()) || (Array.isArray(v) && v.length > 0));
        if (anyContent) return true;
      }
    }
    return false;
  })();

  const fetchSpeech = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/speeches/${id}`);
      setSpeech(data);
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, addToast]);

  useEffect(() => {
    fetchSpeech();
  }, [fetchSpeech]);

  const handleGeneratePlatforms = useCallback(async () => {
    if (!speech || !speech.hook || !speech.context) {
      addToast('Complète au moins le hook et le contexte du script avant de générer.', 'error');
      return;
    }
    setPlatformsLoading(true);
    const script = { hook: speech.hook, context: speech.context, demo: speech.demo, cta: speech.cta };
    try {
      const platforms = await generatePlatforms(script);
      const payload = {
        tiktok: platforms.tiktok || {},
        instagram: platforms.instagram || {},
        youtube: platforms.youtube || {},
        linkedin: platforms.linkedin || {},
        twitter: platforms.twitter || {},
      };
      await api.put(`/api/speeches/${id}`, payload);
      addToast('Contenus réseaux sociaux sauvegardés ✓', 'success');
      const { data } = await api.get(`/api/speeches/${id}`);
      setSpeech(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'génération impossible';
      addToast(`Erreur plateformes : ${msg}. Vérifiez la connexion internet.`, 'error');
    } finally {
      setPlatformsLoading(false);
    }
  }, [id, speech, addToast]);

  const debouncedSave = useCallback((field, value) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(field);
      const payload = typeof value === 'object' ? value : { [field]: value };
      try {
        await api.put(`/api/speeches/${id}`, payload);
        addToast('Sauvegardé ✓', 'info');
        setSpeech((s) => ({ ...s, ...payload }));
      } catch (err) {
        addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
      } finally {
        setSaving(null);
      }
    }, 1000);
  }, [id, addToast]);

  const handleRegenerate = async (type) => {
    setRegenerating(type);
    try {
      const script = { hook: speech.hook, context: speech.context, demo: speech.demo, cta: speech.cta };
      const result = await regenerate(type, script);
      await api.put(`/api/speeches/${id}`, typeof result === 'string' ? { [type]: result } : { [type]: result });
      setSpeech((s) => ({ ...s, [type]: result }));
      addToast('Régénéré ✓', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setRegenerating(null);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const publishedAt = new Date().toISOString();
      await api.put(`/api/speeches/${id}`, { status: 'published', published_at: publishedAt });
      setSpeech((s) => ({ ...s, status: 'published', published_at: publishedAt }));
      setPublishModal(false);
      addToast('Script mis en ligne ✓', 'success');
      if (fromProject) {
        navigate(`/dashboard/project/${fromProject}`, { state: { tab: 'published' } });
      } else {
        navigate('/dashboard', { state: { tab: 'published' } });
      }
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleSelection = async () => {
    const next = !(speech.in_selection === true);
    try {
      await api.put(`/api/speeches/${id}`, { in_selection: next });
      setSpeech((s) => ({ ...s, in_selection: next }));
      addToast(next ? 'Ajouté à la sélection ✓' : 'Retiré de la sélection', 'info');
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleScoreChange = async (score) => {
    setScoreUpdating(true);
    try {
      await api.put(`/api/speeches/${id}`, { score });
      setSpeech((s) => ({ ...s, score }));
    } catch (err) {
      addToast(`Erreur : ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setScoreUpdating(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast('Copié ✓', 'info');
  };

  if (loading || !speech) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta)' }} />
      </div>
    );
  }

  const isDraft = speech.status === 'draft';
  const returnTab = location.state?.returnTab;
  const backTo = fromProject ? `/dashboard/project/${fromProject}` : '/dashboard';
  const backState = returnTab ? { tab: returnTab } : fromProject ? { tab: 'proposals' } : undefined;

  return (
    <div className="space-y-8">
      {/* Barre avec bouton retour */}
      <div className="flex items-center gap-4">
        <Link
          to={backTo}
          state={backState}
          className="flex items-center justify-center w-9 h-9 rounded-lg border transition-all border-[var(--sf-border)] hover:bg-[var(--sf-card-hover)]"
            style={{ color: 'var(--sf-text-muted)' }}
          aria-label="Retour"
        >
          ←
        </Link>
        <span className="text-sm" style={{ color: 'var(--sf-text-dim)' }}>{fromProject ? 'Retour au projet' : 'Retour au dashboard'}</span>
      </div>

      {/* 5 cartes plateformes — indications par défaut, génération au clic sur le bouton */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sf-text)' }}>Adaptations par plateforme</h2>
          <button
            type="button"
            onClick={handleGeneratePlatforms}
            disabled={platformsLoading || hasPlatformData || !speech?.hook || !speech?.context}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-md disabled:cursor-not-allowed ${
              hasPlatformData
                ? 'bg-emerald-600 text-white cursor-default opacity-100'
                : 'bg-[var(--sf-cta)] hover:opacity-90 text-[var(--sf-cta-text)] disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {platformsLoading && (
              <svg className="animate-spin h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {hasPlatformData ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Contenus générés
              </>
            ) : platformsLoading ? (
              'Génération…'
            ) : (
              'Générer les contenus des plateformes'
            )}
          </button>
        </div>
        <div className="flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pb-2 no-scrollbar">
          {['tiktok', 'instagram', 'youtube', 'linkedin', 'twitter'].map((key) => {
            const meta = PLATFORM_LABELS[key];
            const data = speech[key] || {};
            const hasData = hasPlatformData && (data.caption || data.title || data.tweet || data.intro_text || (key === 'twitter' && data.first_comment));
            const showIndications = !hasData && !platformsLoading;
            const isLoading = platformsLoading;
            const indication = PLATFORM_INDICATIONS[key];
            return (
              <div
                key={key}
                className={`shrink-0 w-[300px] min-w-[300px] rounded-xl border-2 ${meta.border} overflow-hidden flex flex-col shadow-lg`}
                style={{ backgroundColor: 'var(--sf-card)' }}
              >
                <div className={`flex items-center justify-between px-4 py-3 ${meta.header}`}>
                  <span className="font-semibold text-base">{meta.name}</span>
                  {hasData && (
                    <button
                      type="button"
                      onClick={() => handleRegenerate(key)}
                      disabled={!!regenerating}
                      className="opacity-80 hover:opacity-100 transition-opacity p-1"
                      title="Régénérer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                    </button>
                  )}
                </div>
                <div className="p-4 flex-1 border-t border-[var(--sf-border)]">
                  {regenerating === key ? (
                    <div className="animate-pulse h-20 rounded" style={{ backgroundColor: 'var(--sf-border)' }} />
                  ) : isLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 rounded w-full" style={{ backgroundColor: 'var(--sf-border)' }} />
                      <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--sf-border)' }} />
                      <div className="h-4 rounded w-5/6" style={{ backgroundColor: 'var(--sf-border)' }} />
                      <div className="h-4 rounded w-2/3" style={{ backgroundColor: 'var(--sf-border)' }} />
                    </div>
                  ) : showIndications ? (
                    <div className="space-y-3 text-sm" style={{ color: 'var(--sf-text-muted)' }}>
                      <div>
                        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--sf-text-dim)' }}>Description</span>
                        <p className="mt-1">{indication.description}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--sf-text-dim)' }}>Comment</span>
                        <p className="mt-1">{indication.how}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--sf-text-dim)' }}>Conseils</span>
                        <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{indication.tips}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      {key === 'youtube' && (
                        <FieldWithCopy label="Titre" value={data.title} onCopy={copyToClipboard} saving={saving} onSave={(v) => debouncedSave(key, { ...data, title: v })} />
                      )}
                      {(key === 'tiktok' || key === 'instagram') && (
                        <FieldWithCopy label="Légende" value={data.caption || data.legende} onCopy={copyToClipboard} saving={saving} onSave={(v) => debouncedSave(key, { ...data, caption: v })} />
                      )}
                      {key === 'linkedin' && (
                        <FieldWithCopy label="Texte d'introduction" value={data.intro_text || data.caption} onCopy={copyToClipboard} saving={saving} onSave={(v) => debouncedSave(key, { ...data, intro_text: v })} />
                      )}
                      {key === 'twitter' && (
                        <>
                          <FieldWithCopy label="Tweet principal" value={data.tweet} onCopy={copyToClipboard} saving={saving} onSave={(v) => debouncedSave(key, { ...data, tweet: v })} />
                          <p className="text-xs" style={{ color: 'var(--sf-cta)' }}>⚠️ Ne mets jamais le lien dans le tweet principal — mets-le dans le 1er commentaire (pénalité algo -30 à -50%)</p>
                          <FieldWithCopy label="1er commentaire" value={data.first_comment} onCopy={copyToClipboard} saving={saving} onSave={(v) => debouncedSave(key, { ...data, first_comment: v })} />
                        </>
                      )}
                      {(data.hashtags || data.hashtags?.length) && (
                        <FieldWithCopy label="Hashtags" value={Array.isArray(data.hashtags) ? data.hashtags.join(' ') : data.hashtags} onCopy={copyToClipboard} saving={saving} onSave={(v) => debouncedSave(key, { ...data, hashtags: v })} />
                      )}
                      {data.cta && (
                        <div>
                          <span className="text-xs uppercase text-slate-500 tracking-wide">CTA recommandé</span>
                          <p className="text-slate-100 mt-1">{data.cta}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-slate-500">Meilleur moment</span>
                        <p className="text-[13px] mt-1 inline-block px-2 py-1 rounded" style={{ backgroundColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}>{meta.bestTime}</p>
                      </div>
                    </div>
                  )}
                </div>
                {saving === key && <p className="text-xs mt-2" style={{ color: 'var(--sf-cta)' }}>Sauvegardé ✓</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Script complet : 4 blocs */}
      <section>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--sf-text)' }}>Script complet</h2>
        <div className="space-y-4">
          {[
            { key: 'hook', label: 'HOOK (2-4s)', color: '#48f0b7' },
            { key: 'context', label: 'CONTEXTE & PROBLÈME', color: '#d97706' },
            { key: 'demo', label: 'DÉMO & PREUVE', color: '#059669' },
            { key: 'cta', label: 'CTA (25-60s total)', color: '#8b5cf6' },
          ].map(({ key, label, color }) => (
            <div
              key={key}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}
              style={{ borderLeftWidth: 4, borderLeftColor: color }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--sf-border)]" style={{ backgroundColor: 'var(--sf-card-hover)' }}>
                <span className="text-[13px] font-semibold" style={{ color }}>{label}</span>
                <button
                  type="button"
                  onClick={() => handleRegenerate(key)}
                  disabled={!!regenerating}
                  className="text-sm transition-colors hover:opacity-100"
            style={{ color: 'var(--sf-text-dim)' }}
                  title="Régénérer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                </button>
              </div>
              <div className="p-4" style={{ backgroundColor: 'var(--sf-bg-elevated)' }}>
                {key === 'cta' && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {['tiktok', 'instagram', 'youtube', 'linkedin', 'twitter'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCtaPlatform(ctaPlatform === p ? null : p)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          ctaPlatform === p ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'bg-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
                        }`}
                        title={PLATFORM_LABELS[p].name}
                      >
                        {p[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {regenerating === key ? (
                  <div className="animate-pulse h-6 rounded w-3/4" style={{ backgroundColor: 'var(--sf-border)' }} />
                ) : (
                  <textarea
                    className="w-full bg-transparent text-slate-100 resize-none border-none focus:ring-0 focus:outline-none p-0"
                    style={{ fontSize: key === 'hook' ? 18 : 16, fontWeight: key === 'hook' ? 600 : 400 }}
                    rows={key === 'hook' ? 2 : 4}
                    value={
                      key === 'cta' && ctaPlatform && speech[ctaPlatform]?.cta
                        ? speech[ctaPlatform].cta
                        : speech[key] || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (key === 'cta' && ctaPlatform) {
                        const next = { ...(speech[ctaPlatform] || {}), cta: val };
                        setSpeech((s) => ({ ...s, [ctaPlatform]: next }));
                        debouncedSave(ctaPlatform, next);
                      } else {
                        setSpeech((s) => ({ ...s, [key]: val }));
                        debouncedSave(key, val);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Boutons Mettre en sélection / Mettre en ligne ou badge En ligne */}
      <div className="flex flex-col items-center gap-4 pt-4">
        {isDraft ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelection}
                className={`px-6 py-3 rounded-xl font-medium text-base transition-all ${
                  speech.in_selection
                    ? 'bg-[var(--sf-border)] border border-[var(--sf-border-light)] hover:bg-[var(--sf-card-hover)]'
                    : 'bg-[var(--sf-accent)] hover:opacity-90'
                }`}
                style={{ color: speech.in_selection ? 'var(--sf-text-muted)' : 'var(--sf-cta-text)' }}
              >
                {speech.in_selection ? 'Retirer de la sélection' : 'Mettre en sélection'}
              </button>
              <button
                type="button"
                onClick={() => setPublishModal(true)}
                className="px-12 py-4 rounded-xl font-semibold text-base transition-all bg-[var(--sf-cta)] hover:opacity-90"
            style={{ color: 'var(--sf-cta-text)' }}
              >
                Mettre en ligne
              </button>
            </div>
            {publishModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={() => !publishing && setPublishModal(false)}
              >
                <div
                  className="w-full max-w-md rounded-xl p-6 shadow-xl border border-[var(--sf-border)]"
                  style={{ backgroundColor: 'var(--sf-card)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--sf-text)' }}>Mettre ce script en ligne ?</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--sf-text-muted)' }}>Il sera déplacé dans la section En ligne.</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setPublishModal(false)}
                      disabled={publishing}
                      className="px-4 py-2 rounded-lg border transition-colors border-[var(--sf-border)] hover:bg-[var(--sf-card-hover)]"
                      style={{ color: 'var(--sf-text-muted)' }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishing}
                      className="px-4 py-2 rounded-lg font-medium bg-[var(--sf-cta)] hover:opacity-90"
                    style={{ color: 'var(--sf-cta-text)' }}
                    >
                      {publishing ? 'En cours…' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="px-4 py-2 rounded-lg border font-medium bg-[var(--sf-cta)]/10" style={{ borderColor: 'rgba(72,240,183,0.5)', color: 'var(--sf-cta)' }}>
              En ligne depuis le {formatDate(speech.published_at)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>Score :</span>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={scoreUpdating}
                  onClick={() => handleScoreChange(n)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    speech.score === n ? 'bg-[var(--sf-cta)] text-[var(--sf-cta-text)]' : 'bg-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FieldWithCopy({ label, value, onCopy, saving, onSave }) {
  const [editing, setEditing] = useState(false);
  const val = value || '';
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--sf-text-dim)' }}>{label}</span>
        <CopyIcon onClick={() => onCopy(val)} title="Copier" />
      </div>
      {editing ? (
        <textarea
          className="w-full mt-1 px-3 py-2 rounded text-sm resize-none min-h-[140px] max-h-[240px] overflow-y-auto scrollbar-thin border border-[var(--sf-border)]"
          style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text)' }}
          value={val}
          onChange={(e) => onSave(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <p
          className="text-sm mt-1 cursor-text min-h-[2.5rem]"
        style={{ color: 'var(--sf-text)' }}
          onClick={() => setEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
        >
          {val || '—'}
        </p>
      )}
      {saving && <span className="text-xs" style={{ color: 'var(--sf-cta)' }}>Sauvegardé ✓</span>}
    </div>
  );
}
