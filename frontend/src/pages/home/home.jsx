import { useEffect } from 'react';

const PLATFORM_LABELS = {
  tiktok: {
    name: 'TikTok',
    border: 'border-cyan-400/40',
    header: 'bg-black/80 text-cyan-300',
  },
  instagram: {
    name: 'Instagram Reels',
    border: 'border-pink-400/40',
    header: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white',
  },
  youtube: {
    name: 'YouTube Shorts',
    border: 'border-red-500/40',
    header: 'bg-[#FF0000] text-white',
  },
  linkedin: {
    name: 'LinkedIn',
    border: 'border-[#0A66C2]/60',
    header: 'bg-[#0A66C2] text-white',
  },
  twitter: {
    name: 'X (Twitter)',
    border: 'border-slate-500/40',
    header: 'bg-black text-white',
  },
};

const PLATFORM_PREVIEWS = [
  {
    key: 'tiktok',
    title: 'Hook direct + preuve en 20 secondes',
    body: 'Tu perds du temps à écrire tes scripts ? Voici la structure qui nous a fait passer de 2 à 8 vidéos publiées par semaine.',
    cta: 'Commente "SCRIPT" pour recevoir le template.',
  },
  {
    key: 'instagram',
    title: 'La méthode simple pour mieux convertir',
    body: 'Si tes reels sont vus mais ne vendent pas, le problème est souvent la structure. Hook, problème, solution, CTA.',
    cta: 'Enregistre ce post pour ton prochain tournage.',
  },
  {
    key: 'youtube',
    title: '3 erreurs qui bloquent tes vidéos',
    body: 'Tu donnes trop de contexte, pas assez de preuve, et un CTA trop flou. Corrige ça et ton message devient actionnable.',
    cta: 'Abonne-toi pour la suite.',
  },
  {
    key: 'linkedin',
    title: 'Pourquoi la plupart des scripts B2B ne convertissent pas',
    body: 'Ils parlent de la marque, pas du problème client. Revenir à une trame claire change immédiatement la qualité des leads.',
    cta: 'Je partage notre structure complète en commentaire.',
  },
  {
    key: 'twitter',
    title: 'Ton contenu n&apos;est pas le problème',
    body: 'Le vrai sujet : tu n&apos;as pas de système. Structure tes scripts, mesure ce qui performe, puis recycle intelligemment.',
    cta: 'Lien + exemple dans le 1er commentaire.',
  },
];

function Home() {
  useEffect(() => {
    document.title = 'LvlScript - Générateur de scripts vidéo qui convertissent';

    const ensureMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const ensurePropertyMeta = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const description = 'LvlScript génère des scripts structurés, apprend des meilleurs contenus et adapte en un clic pour chaque réseau social.';
    ensureMeta('description', description);
    ensureMeta('robots', 'index, follow');
    ensurePropertyMeta('og:title', 'LvlScript - Générateur de scripts vidéo');
    ensurePropertyMeta('og:description', description);
    ensurePropertyMeta('og:type', 'website');
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--sf-bg-gradient)', backgroundColor: 'var(--sf-bg)' }}
    >
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-bg-elevated-strong)' }}
      >
        <div
          className="mx-auto px-6 sm:px-8 py-4 flex items-center justify-between gap-4"
          style={{ maxWidth: 'var(--sf-content-width)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold shadow-md"
              style={{ backgroundColor: 'var(--sf-cta)', color: 'var(--sf-cta-text)' }}
            >
              S
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span
                className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: 'var(--sf-heading-font)', color: 'var(--sf-text)' }}
              >
                LvlScript
              </span>
              <span className="text-xs truncate" style={{ color: 'var(--sf-text-dim)' }}>
                Des scripts qui transforment en clients.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium border transition-colors"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)', backgroundColor: 'var(--sf-card)' }}
            >
              Se connecter
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap text-center w-full sm:w-auto"
              style={{ backgroundColor: 'var(--sf-cta)', color: 'var(--sf-cta-text)' }}
            >
              Essai gratuit
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section
          className="px-6 sm:px-8 pt-14 pb-12 sm:pt-20 sm:pb-16"
          style={{ maxWidth: 'var(--sf-content-width)', margin: '0 auto' }}
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
            <div className="space-y-7">
              <p className="sf-section-label text-sm sm:text-base">Pour créateurs, coachs et SaaS B2B</p>
              <h1 className="sf-heading-display-lg text-4xl sm:text-5xl lg:text-6xl">
                Génération de scripts intelligente
                <br />
                <span className="text-3xl sm:text-4xl lg:text-5xl" style={{ color: 'var(--sf-cta)' }}>
                  qui apprend de tes meilleurs résultats.
                </span>
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed max-w-2xl" style={{ color: 'var(--sf-text-muted)' }}>
                Tu génères tes scripts, LvlScript apprend de ce qui performe et tu adaptes instantanément pour tous tes réseaux.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/login"
                  className="sf-cta-button text-base sm:text-lg bg-[var(--sf-cta)] hover:bg-[var(--sf-cta-hover)] shadow-md hover:shadow-lg whitespace-nowrap text-center w-full sm:w-auto"
                  style={{ color: 'var(--sf-cta-text)' }}
                >
                  Commencer maintenant
                </a>
                <a
                  href="#specificites"
                  className="sf-cta-button text-base sm:text-lg border whitespace-nowrap text-center w-full sm:w-auto"
                  style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)', backgroundColor: 'var(--sf-card)' }}
                >
                  Voir les 3 spécificités
                </a>
              </div>
              <p className="text-sm sm:text-base" style={{ color: 'var(--sf-text-dim)' }}>
                Sans carte bancaire • Mise en route en moins de 5 minutes
              </p>
            </div>

            <div className="rounded-3xl sf-card-style p-7 sm:p-8 space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--sf-section-num)' }}>
                Ce que tu obtiens
              </p>
              <div className="space-y-4">
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--sf-border-light)', backgroundColor: 'var(--sf-surface-alt)' }}>
                  <p className="text-base font-semibold" style={{ color: 'var(--sf-text)' }}>
                    Structure Hook - Problème - Solution - CTA
                  </p>
                  <p className="text-sm mt-1.5" style={{ color: 'var(--sf-text-dim)' }}>
                    Chaque génération suit la trame qui fait passer à l&apos;action.
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--sf-border-light)', backgroundColor: 'var(--sf-surface-alt)' }}>
                  <p className="text-base font-semibold" style={{ color: 'var(--sf-text)' }}>
                    Apprentissage par performances
                  </p>
                  <p className="text-sm mt-1.5" style={{ color: 'var(--sf-text-dim)' }}>
                    Les meilleurs scripts influencent les générations suivantes.
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--sf-border-light)', backgroundColor: 'var(--sf-surface-alt)' }}>
                  <p className="text-base font-semibold" style={{ color: 'var(--sf-text)' }}>
                    Copy/paste multi-plateformes
                  </p>
                  <p className="text-sm mt-1.5" style={{ color: 'var(--sf-text-dim)' }}>
                    Tu copies ton contenu adapté en un clic vers chaque réseau.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="specificites"
          className="px-6 sm:px-8 py-12 sm:py-16"
          style={{ maxWidth: 'var(--sf-content-width)', margin: '0 auto' }}
        >
          <p className="sf-section-label text-sm sm:text-base">3 spécificités clés</p>
          <h2 className="sf-heading-display mb-8 text-3xl sm:text-4xl">Clair, actionnable, orienté conversion.</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl sf-card-style p-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--sf-text)' }}>
                1) Génération de scripts structurés
              </h3>
              <p className="text-base leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
                Tu obtiens des scripts prêts à tourner avec une architecture constante : hook, problème, solution, CTA.
              </p>
            </article>
            <article className="rounded-2xl sf-card-style p-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--sf-text)' }}>
                2) Optimisation continue
              </h3>
              <p className="text-base leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
                Le système tient compte des scripts qui ont bien fonctionné pour renforcer les prochaines générations.
              </p>
            </article>
            <article className="rounded-2xl sf-card-style p-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--sf-text)' }}>
                3) Diffusion ultra rapide
              </h3>
              <p className="text-base leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
                Un système de copier-coller te permet de publier instantanément sur chaque réseau social.
              </p>
            </article>
          </div>
        </section>

        <section
          className="px-6 sm:px-8 py-12 sm:py-16"
          style={{ maxWidth: 'var(--sf-content-width)', margin: '0 auto' }}
        >
          <p className="sf-section-label text-sm sm:text-base">Aperçu concret</p>
          <h2 className="sf-heading-display mb-8 text-3xl sm:text-4xl">Cartes réseaux en défilement.</h2>
          <div className="sf-marquee-mask">
            <div className="sf-marquee-track">
              {[...PLATFORM_PREVIEWS, ...PLATFORM_PREVIEWS].map((preview, index) => {
                const meta = PLATFORM_LABELS[preview.key];
                return (
                  <article
                    key={`${preview.key}-${index}`}
                    className={`w-[320px] min-w-[320px] rounded-xl border-2 ${meta.border} overflow-hidden flex flex-col shadow-lg`}
                    style={{ backgroundColor: 'var(--sf-card)' }}
                  >
                    <div className={`flex items-center justify-between px-4 py-3 ${meta.header}`}>
                      <span className="font-semibold text-base">{meta.name}</span>
                      <span className="text-xs opacity-90">Aperçu</span>
                    </div>
                    <div className="p-4 space-y-3 border-t border-[var(--sf-border)]">
                      <p className="text-sm font-semibold" style={{ color: 'var(--sf-text)' }}>
                        {preview.title}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
                        {preview.body}
                      </p>
                      <div className="rounded-lg border px-3 py-2 flex items-center justify-between gap-3" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)' }}>
                        <p className="text-xs" style={{ color: 'var(--sf-text-dim)' }}>
                          {preview.cta}
                        </p>
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-[var(--sf-accent-soft)] text-[var(--sf-accent)]">
                          Copier
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="px-6 sm:px-8 pt-12 pb-20 sm:pt-16 sm:pb-24"
          style={{ maxWidth: 'var(--sf-content-width)', margin: '0 auto' }}
        >
          <div className="rounded-3xl sf-card-style p-8 sm:p-10 text-center space-y-5">
              <p className="sf-section-label text-sm sm:text-base">Passe à l&apos;action</p>
            <h2 className="sf-heading-display text-3xl sm:text-4xl lg:text-5xl">
              Ton prochain client peut venir
              <br />
              de ta prochaine vidéo.
            </h2>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto" style={{ color: 'var(--sf-text-muted)' }}>
              Lance LvlScript aujourd&apos;hui et transforme tes idées en contenu qui convertit.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href="/login"
                className="sf-cta-button text-base sm:text-lg bg-[var(--sf-cta)] hover:bg-[var(--sf-cta-hover)] shadow-md hover:shadow-lg whitespace-nowrap text-center w-full sm:w-auto"
                style={{ color: 'var(--sf-cta-text)' }}
              >
                Démarrer gratuitement
              </a>
              <a
                href="/login"
                className="sf-cta-button text-base sm:text-lg border whitespace-nowrap text-center w-full sm:w-auto"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)', backgroundColor: 'var(--sf-card)' }}
              >
                Voir le tableau de bord
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--sf-border)' }}>
        <div
          className="mx-auto px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
          style={{ maxWidth: 'var(--sf-content-width)', color: 'var(--sf-text-dim)' }}
        >
          <p>© {new Date().getFullYear()} LvlScript. Tous droits réservés.</p>
          <div className="flex gap-4">
            <span>Confidentialité</span>
            <span>Conditions</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
