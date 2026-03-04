/**
 * Service OpenAI pour SpeechForge : génération de scripts et adaptations plateformes.
 * Utilise gpt-4o-mini.
 */
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';
const WIKI_TIMEOUT_MS = 2500;
const PROFILE_ADJECTIVES = [
  'reconnu',
  'célèbre',
  'éminent',
  'incontournable',
  'réputé',
  'pionnier',
  'influent',
];

function pickProfileAdjective() {
  return PROFILE_ADJECTIVES[Math.floor(Math.random() * PROFILE_ADJECTIVES.length)];
}

const PROFILE_KEYWORDS = [
  'philosophe',
  'philosopher',
  'scientifique',
  'scientist',
  'chercheur',
  'researcher',
  'neuroscientifique',
  'neuroscientist',
  'psychologue',
  'psychologist',
  'sociologue',
  'sociologist',
  'économiste',
  'economist',
  'auteur',
  'author',
  'professeur',
  'professor',
  'historien',
  'historian',
  'médecin',
  'physician',
  'entrepreneur',
  'expert',
  'formateur',
  'trainer',
  'créateur',
  'creator',
  'écrivain',
  'writer',
];

const SYSTEM_PROMPT_7_SCRIPTS = `Tu es un expert en scripts vidéo courts (TikTok, Reels, Shorts) pour SaaS. Tu écris des scripts voix off en français, percutants, crédibles et orientés conversion.

{saasDescriptionBlock}
{capitalArgumentatifBlock}
{argumentativeRulesBlock}

STRUCTURE OBLIGATOIRE POUR CHAQUE SCRIPT :
1) HOOK (2-4s, 1-2 phrases)
2) CONTEXTE & PROBLÈME (5-15s, 2-4 phrases)
3) DÉMO & PREUVE (12-40s, 3-6 phrases concrètes)
4) CTA (3-6s, appel à l'action clair)

RÈGLES FONDAMENTALES :
- Le produit n'est pas le point de départ. Il doit apparaître comme la réponse naturelle à une tension plus large.
- N'écris jamais un script qui se limite à lister des fonctionnalités.
- Le hook doit cibler un vrai problème métier ou un désir concret.
- INTERDIT : parler de gestion de compte (inscription, mot de passe, déconnexion, etc.).
- Durée totale visée : 25 à 60 secondes.
- Ton : direct, humain, conversationnel, sans jargon inutile.
- N'annonce jamais explicitement "selon une étude scientifique" ou "référence scientifique".

AMPLIFICATEURS POSSIBLES (si pertinents, sans surcharger) :
- scientifique (biais cognitifs, attention, motivation)
- statistique (tendance de marché, ordre de grandeur crédible)
- historique (innovation/rupture)
- sociologique (économie de l'attention, surcharge)
- anthropologique (statut, reconnaissance, validation sociale)
- stratégique (rareté, autorité, timing)

UTILISATION DU CAPITAL ARGUMENTATIF :
- Le capital argumentatif est un bonus optionnel, pas une contrainte systématique.
- Réutilise EXPLICITEMENT des références, noms, concepts, auteurs, entreprises ou exemples qui figurent dans ce capital argumentatif.
- Si des noms propres existent dans le capital argumentatif, cite-les textuellement (orthographe fidèle) dans les scripts.
- N'invente jamais de personne, d'étude ou de citation si elle n'est pas présente dans le capital argumentatif.
- Tu peux tourner en dérision certains concepts du capital argumentatif dans le HOOK quand c'est pertinent (ironie maîtrisée, jamais insultant), pour créer de la tension et capter l'attention.
- Si un nom de personne/théorie est disponible, tu peux (rarement) utiliser des hooks formulés comme :
  "X avait raison",
  "Tu ne connais pas la théorie de X ?",
  "X, sans le savoir, avait déjà décrit ce problème".
- À chaque fois qu'une référence est citée, ajoute une explication brève :
  qui est la personne / ce qu'est la théorie ou la notion / ce que dit l'article,
  puis le lien concret avec l'idée du script.
- Cette explication doit rester concise (une phrase courte, maximum deux).
- RÈGLE OBLIGATOIRE — Quand tu cites une personne, indique TOUJOURS qui elle est (2 mots max : philosophe, psychologue, formateur, etc.) puis un adjectif adapté (ex: reconnu, célèbre, éminent, incontournable, réputé, pionnier). Exemple : "John Sweller, psychologue reconnu, avait raison : …"
  Le lecteur doit savoir immédiatement de qui tu parles. Ne cite jamais un nom sans cette qualification.

IMPORTANT : ne génère JAMAIS un contenu similaire à ce qui existe déjà. Voici les scripts existants (propositions en cours) et déjà publiés (hooks et piliers) à ne pas dupliquer — utilise des angles et formulations distincts : {existingScriptsSummary}.

IMPORTANT — RÈGLE 40/30/30 : Parmi les 7 scripts à générer :
— Environ 3 (40%) : inspire-toi des scripts mis en ligne qui ont bien fonctionné (ci-dessous). Réutilise leur structure de hook, angle narratif, type de problème ou style de démo, avec de nouveaux exemples et formulations.
— Environ 2 (30%) : inspire-toi des scripts qui ont bien fonctionné OU des scripts en sélection (ci-dessous), mais améliore fortement la formulation.
— Environ 2 (30%) : angles, hooks et formulations entièrement originaux et clairement distincts.

Scripts mis en ligne (bons scores) :
{topScriptsSummary}

Scripts en sélection (à améliorer en formulation) :
{selectionScriptsSummary}

RÈGLE : Aucun champ hook, context, demo ou cta ne doit être vide. Chaque script doit être complet.

Réponds uniquement en JSON valide : un objet avec une clé "scripts" contenant un tableau de 7 objets. Chaque objet a les clés : hook, context, demo, cta, pillar, hook_type. Pas de markdown, pas de \`\`\`json.`;

const SYSTEM_PROMPT_PLATFORMS = `Adapte ce script vidéo SaaS aux 5 plateformes. Voici le script : hook, contexte, démo, cta.

TikTok : légende casual et directe (max 300 car), 3-5 hashtags mix tendance/niche, CTA orienté commentaire ou follow.

Instagram Reels : légende orientée action, 3-5 hashtags ciblés, CTA orienté DM ou lien en bio.

YouTube Shorts : titre SEO (Comment… / Top X… / Pourquoi…), description longue riche en mots-clés, 3-5 hashtags SEO, CTA abonnement + lien en description.

LinkedIn : l'objet linkedin doit contenir OBLIGATOIREMENT la clé "intro_text" (texte principal du post, professionnel et éducatif, pas de promo directe), plus "hashtags" (2-3 sectoriels max) et "cta" (orienté discussion en commentaire). Pas d'autre clé pour le texte principal.

X/Twitter : tweet punchy max 280 car sans lien (pénalité algo), 1er commentaire séparé avec le lien, 1-2 hashtags max, CTA orienté RT ou engagement.

Réponds uniquement en JSON valide avec les clés : tiktok, instagram, youtube, linkedin, twitter. Structure attendue : tiktok/instagram = caption (ou legende), hashtags, cta ; youtube = title, description, hashtags, cta ; linkedin = intro_text, hashtags, cta ; twitter = tweet, first_comment, hashtags, cta. Pas de markdown, pas de \`\`\`json.`;

function parseScriptsResponse(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const match = content.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : { scripts: [] };
  }
  const list = Array.isArray(parsed) ? parsed : (parsed.scripts || parsed.list || []);
  return list;
}

function normalizeForMatch(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLikelyPersonNames(capitalArgumentatif = '') {
  const raw = String(capitalArgumentatif || '');
  const names = new Set();
  const nameRegex = /\b[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’-]+){1,2}\b/g;
  let match;
  while ((match = nameRegex.exec(raw)) !== null) {
    const candidate = (match[0] || '').trim();
    if (candidate.length >= 5 && candidate.length <= 60) {
      names.add(candidate);
    }
  }
  return Array.from(names).slice(0, 20);
}

function textHasProfileNearName(text = '', personName = '') {
  if (!text || !personName) return true;
  const normalizedText = normalizeForMatch(text);
  const normalizedName = normalizeForMatch(personName);
  const idx = normalizedText.indexOf(normalizedName);
  if (idx < 0) return true; // Le nom n'est pas cité dans ce texte.
  const windowStart = Math.max(0, idx - 90);
  const windowEnd = Math.min(normalizedText.length, idx + normalizedName.length + 120);
  const around = normalizedText.slice(windowStart, windowEnd);
  return PROFILE_KEYWORDS.some((kw) => around.includes(normalizeForMatch(kw)));
}

function scriptHasMissingPersonProfile(script = {}, personNames = []) {
  if (!personNames.length) return false;
  const allBlocks = [
    script.hook || '',
    script.context || '',
    script.demo || '',
    script.cta || '',
  ].join('\n');

  return personNames.some((name) => {
    const nameRegex = new RegExp(`\\b${escapeRegExp(name)}\\b`);
    if (!nameRegex.test(allBlocks)) return false;
    return !textHasProfileNearName(allBlocks, name);
  });
}

function isBlockEmpty(value) {
  const s = String(value || '').trim();
  return !s || s.includes('[à compléter]');
}

function sanitizeScriptBlocks(script = {}) {
  return {
    ...script,
    hook: String(script.hook || '').trim(),
    context: String(script.context || '').trim(),
    demo: String(script.demo || '').trim(),
    cta: String(script.cta || '').trim(),
    pillar: script.pillar ?? null,
    hook_type: script.hook_type ?? null,
  };
}

/**
 * Remplit les blocs vides d'un script en appelant l'API de régénération (évite les placeholders).
 */
async function fillEmptyScriptBlocks(script = {}) {
  const keys = ['hook', 'context', 'demo', 'cta'];
  let current = { ...script };
  for (const key of keys) {
    if (isBlockEmpty(current[key])) {
      try {
        const filled = await regenerateOne(key, { script: current });
        if (filled && String(filled).trim()) current[key] = String(filled).trim();
      } catch (err) {
        console.error(`fillEmptyScriptBlocks(${key}):`, err.message);
      }
    }
  }
  return current;
}

function annotateNameWithProfile(text = '', personName = '', profile = '') {
  if (!text || !personName) return text;
  if (!new RegExp(`\\b${escapeRegExp(personName)}\\b`).test(text)) return text;
  if (textHasProfileNearName(text, personName)) return text;
  const label = (profile || '').trim() || 'chercheur';
  const adjective = pickProfileAdjective();
  return text.replace(new RegExp(`\\b${escapeRegExp(personName)}\\b`), `${personName}, ${label} ${adjective},`);
}

function enforcePersonProfiles(script = {}, personNames = [], webProfiles = []) {
  if (!personNames.length) return script;
  const profileByName = new Map(
    (webProfiles || []).map((item) => [item.name, item.profile])
  );

  let next = {
    ...script,
    hook: script.hook || '',
    context: script.context || '',
    demo: script.demo || '',
    cta: script.cta || '',
  };

  personNames.forEach((name) => {
    const profile = profileByName.get(name) || 'chercheur';
    next = {
      ...next,
      hook: annotateNameWithProfile(next.hook, name, profile),
      context: annotateNameWithProfile(next.context, name, profile),
      demo: annotateNameWithProfile(next.demo, name, profile),
      cta: annotateNameWithProfile(next.cta, name, profile),
    };
  });

  return next;
}

async function rewriteScriptWithPersonProfiles(script = {}, capitalArgumentatif = '') {
  const personNames = extractLikelyPersonNames(capitalArgumentatif);
  const webProfiles = await fetchProfilesFromWikipedia(personNames);
  const webProfilesBlock = webProfiles.length
    ? webProfiles.map((item) => `- ${item.name}: ${item.profile}`).join('\n')
    : '(aucun profil web fiable trouvé)';

  const rewriteSystem = `Tu es éditeur de scripts vidéo.
Ta mission: conserver le fond du script, mais ajouter une qualification explicite quand une personne est citée.
Règle stricte: si un nom de personne est mentionné, précise TOUJOURS qui elle est (2 mots max : philosophe, psychologue, etc.) puis un adjectif adapté (reconnu, célèbre, éminent, incontournable, réputé, pionnier). Exemple : "X, psychologue reconnu, avait raison : …"
Rester concis, naturel, sans alourdir. Ne pas inventer de personne. Utilise les profils fournis en priorité.
Réponds uniquement en JSON objet avec: hook, context, demo, cta, pillar, hook_type.`;

  const rewriteUser = `Capital argumentatif:
${capitalArgumentatif || '(vide)'}

Profils personnes (source web, best effort):
${webProfilesBlock}

Script à corriger (si nécessaire):
${JSON.stringify(script)}

Corrige uniquement si un nom de personne est cité sans profil explicite.
Si un profil web est disponible, utilise-le en priorité.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: rewriteSystem },
      { role: 'user', content: rewriteUser },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return script;
  const parsed = JSON.parse(content);
  const next = parsed.script && typeof parsed.script === 'object' ? parsed.script : parsed;

  return {
    hook: next.hook || script.hook || '',
    context: next.context || script.context || '',
    demo: next.demo || script.demo || '',
    cta: next.cta || script.cta || '',
    pillar: next.pillar || script.pillar || null,
    hook_type: next.hook_type || script.hook_type || null,
  };
}

async function fetchWikipediaProfile(name = '', lang = 'fr') {
  const page = encodeURIComponent(String(name || '').trim().replace(/\s+/g, '_'));
  if (!page) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WIKI_TIMEOUT_MS);
  try {
    const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${page}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const profile = String(data.description || '').trim();
    if (profile) return profile;

    const extract = String(data.extract || '').trim();
    if (!extract) return null;
    const shortExtract = extract.split('.').slice(0, 1).join('.').trim();
    return shortExtract || null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function condenseProfileToFewWords(profile = '') {
  const s = String(profile || '').trim();
  if (!s || s.split(/\s+/).length <= 4) return s;
  const words = s.split(/[\s,]+/).filter(Boolean);
  const found = words.filter((w) =>
    PROFILE_KEYWORDS.some((kw) => normalizeForMatch(w).includes(normalizeForMatch(kw)))
  );
  if (found.length >= 1) return found.slice(0, 2).join(', ');
  return words.slice(0, 3).join(' ');
}

async function fetchProfilesFromWikipedia(personNames = []) {
  const limited = Array.isArray(personNames) ? personNames.slice(0, 6) : [];
  if (!limited.length) return [];

  const settled = await Promise.allSettled(
    limited.map(async (name) => {
      const frProfile = await fetchWikipediaProfile(name, 'fr');
      const enProfile = frProfile ? null : await fetchWikipediaProfile(name, 'en');
      let profile = frProfile || enProfile;
      if (!profile) return null;
      profile = condenseProfileToFewWords(profile) || profile;
      return { name, profile };
    })
  );

  return settled
    .map((res) => (res.status === 'fulfilled' ? res.value : null))
    .filter(Boolean);
}

function buildSevenScriptsSystemPrompt(
  existingScriptsSummary,
  topScriptsSummary,
  selectionScriptsSummary,
  saasDescription = '',
  capitalArgumentatif = '',
  argumentativeIntensity = 'moyenne',
  capitalReferenceMode = 'normal',
  profilesForPrompt = ''
) {
  const normalizedIntensity = ['faible', 'moyenne', 'forte'].includes(argumentativeIntensity)
    ? argumentativeIntensity
    : 'moyenne';
  const hasCapital = Boolean((capitalArgumentatif || '').trim());
  const targetWithReferences = hasCapital
    ? { faible: 0, moyenne: 2, forte: 3 }[normalizedIntensity]
    : { faible: 1, moyenne: 2, forte: 3 }[normalizedIntensity];
  const minWithReferences = Math.max(0, targetWithReferences - 1);
  const maxWithReferences = Math.min(7, targetWithReferences + 1);
  const targetNamedReferences = hasCapital ? (normalizedIntensity === 'forte' ? 2 : 1) : 0;
  const satiricalHooksTarget = hasCapital ? (normalizedIntensity === 'forte' ? 1 : 0) : 0;

  const saasDescriptionBlock = (saasDescription || '').trim()
    ? `DESCRIPTION DU PRODUIT / SAAS À PROMOUVOIR (tous les scripts doivent s'appuyer sur ce contexte) :\n${saasDescription.trim()}\n\n`
    : '';
  const capitalArgumentatifBlock = hasCapital
    ? `CAPITAL ARGUMENTATIF DISPONIBLE (à utiliser de manière sélective, fluide et naturelle) :\n${capitalArgumentatif.trim()}\n\n`
    : 'CAPITAL ARGUMENTATIF DISPONIBLE : aucun contenu fourni.\n\n';
  const profilesBlock = (profilesForPrompt || '').trim()
    ? `\nPROFILS DES PERSONNES À CITER (utilise ces qualifications en 2 mots quand tu cites) :\n${profilesForPrompt.trim()}\n`
    : '';
  const argumentativeRulesBlock = hasCapital
    ? `INTENSITÉ_ARGUMENTATIVE : ${normalizedIntensity}
- Inclure des références/amplificateurs dans environ ${targetWithReferences}/7 scripts (tolérance ${minWithReferences} à ${maxWithReferences}).
- Au moins ${targetNamedReferences}/7 scripts doivent citer explicitement des noms/concepts présents dans le capital argumentatif.
- Quand des noms propres existent dans le capital argumentatif, cites-en occasionnellement (pas systématique), surtout hook, contexte ou démo.
- Tu peux intégrer de l'ironie dans environ ${satiricalHooksTarget}/7 hooks (soit ~5-10% des scripts), en tournant en dérision un concept du capital argumentatif si cela sert l'impact.
- Les références externes restent possibles avec parcimonie.`
    : `INTENSITÉ_ARGUMENTATIVE : ${normalizedIntensity}
- Inclure des références/amplificateurs dans environ ${targetWithReferences}/7 scripts (tolérance ${minWithReferences} à ${maxWithReferences}).
- Sans capital argumentatif, appuie-toi parfois sur des références générales connues (pas trop précises si incertaines).
- Les références doivent rester exceptionnelles, naturelles, et ne pas apparaître dans chaque script.`;
  const strictCapitalBlock = hasCapital && capitalReferenceMode === 'strict'
    ? `\nMODE RÉFÉRENCES FORTES (actif pour CETTE génération) :
- Le script doit s'appuyer explicitement sur le capital argumentatif fourni.
- Citer au moins 2 références explicites du capital (nom, théorie, notion ou article).
- Au moins 1 référence doit apparaître dans le hook ou le contexte.
- Si possible, utilise une formulation de hook type : "X avait raison" ou "Tu ne connais pas la théorie de X ?".
- Pour chaque référence citée, ajoute une explication brève de ce que c'est et du lien avec le script.
- Si une personne est citée, indique son profil puis un adjectif adapté (ex: philosophe reconnu, chercheur éminent).`
    : '';
  return SYSTEM_PROMPT_7_SCRIPTS
    .replace('{saasDescriptionBlock}', saasDescriptionBlock)
    .replace('{capitalArgumentatifBlock}', capitalArgumentatifBlock + profilesBlock)
    .replace('{argumentativeRulesBlock}', `${argumentativeRulesBlock}${strictCapitalBlock}`)
    .replace('{existingScriptsSummary}', existingScriptsSummary || 'Aucun script existant.')
    .replace('{topScriptsSummary}', (topScriptsSummary || '').trim() ? `\n${topScriptsSummary.trim()}\n` : 'Aucun script mis en ligne pour l\'instant.')
    .replace('{selectionScriptsSummary}', (selectionScriptsSummary || '').trim() ? `\n${selectionScriptsSummary.trim()}\n` : 'Aucun script en sélection.');
}

/**
 * Génère 7 propositions de scripts.
 * @param {string} existingScriptsSummary - Résumé des hooks/piliers existants à ne pas dupliquer
 * @param {string} topScriptsSummary - Résumé des scripts avec score >= 7
 * @param {string} selectionScriptsSummary - Résumé des scripts en sélection (pour les 30% à améliorer en formulation)
 * @param {string} saasDescription - Description du SaaS/app pour personnaliser les scripts
 * @param {string} capitalArgumentatif - Banque d'arguments/références pour enrichir certains scripts
 * @param {'faible'|'moyenne'|'forte'} argumentativeIntensity - Intensité d'utilisation des amplificateurs
 * @returns {Promise<Array<{hook, context, demo, cta, pillar, hook_type}>>}
 */
async function generate7Scripts(
  existingScriptsSummary,
  topScriptsSummary,
  selectionScriptsSummary,
  saasDescription = '',
  capitalArgumentatif = '',
  argumentativeIntensity = 'moyenne'
) {
  let profilesForPrompt = '';
  let webProfiles = [];
  if ((capitalArgumentatif || '').trim()) {
    const personNames = extractLikelyPersonNames(capitalArgumentatif);
    webProfiles = await fetchProfilesFromWikipedia(personNames);
    profilesForPrompt = webProfiles.length
      ? webProfiles.map((p) => `- ${p.name}: ${p.profile}`).join('\n')
      : '';
  }

  const system = buildSevenScriptsSystemPrompt(
    existingScriptsSummary,
    topScriptsSummary,
    selectionScriptsSummary,
    saasDescription,
    capitalArgumentatif,
    argumentativeIntensity,
    'normal',
    profilesForPrompt
  );

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: (saasDescription || '').trim() ? 'Génère 7 scripts différents pour ce produit.' : 'Génère 7 scripts différents.' },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Réponse OpenAI vide');

  let list = parseScriptsResponse(content);
  if (list.length < 7) throw new Error(`Attendu 7 scripts, reçu ${list.length}`);
  list = list.slice(0, 7);

  list = list.map((s) => sanitizeScriptBlocks(s));

  // Profils des personnes citées (avec adjectif)
  if ((capitalArgumentatif || '').trim()) {
    const personNames = extractLikelyPersonNames(capitalArgumentatif);
    list = list.map((s) => enforcePersonProfiles(s, personNames, webProfiles));
  }

  // Remplir les blocs vides par régénération (pas de placeholder)
  const filled = [];
  for (const s of list) {
    const script = await fillEmptyScriptBlocks(s);
    filled.push(script);
  }

  return filled;
}

async function generateSingleScript(
  existingScriptsSummary = '',
  topScriptsSummary = '',
  selectionScriptsSummary = '',
  saasDescription = '',
  capitalArgumentatif = '',
  argumentativeIntensity = 'moyenne',
  capitalReferenceMode = 'normal',
  currentBatchSummary = ''
) {
  let profilesForPrompt = '';
  let webProfiles = [];
  if ((capitalArgumentatif || '').trim()) {
    const personNames = extractLikelyPersonNames(capitalArgumentatif);
    webProfiles = await fetchProfilesFromWikipedia(personNames);
    profilesForPrompt = webProfiles.length
      ? webProfiles.map((p) => `- ${p.name}: ${p.profile}`).join('\n')
      : '';
  }

  const currentBatchBlock = (currentBatchSummary || '').trim()
    ? `\nScripts déjà générés dans ce lot courant (à ne pas dupliquer) :\n${currentBatchSummary.trim()}\n`
    : '';
  const system = `${buildSevenScriptsSystemPrompt(
    existingScriptsSummary,
    topScriptsSummary,
    selectionScriptsSummary,
    saasDescription,
    capitalArgumentatif,
    argumentativeIntensity,
    capitalReferenceMode,
    profilesForPrompt
  )}\n${currentBatchBlock}\nTu dois générer exactement 1 seul script (pas 7).`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: capitalReferenceMode === 'strict'
          ? 'Génère exactement 1 script unique en MODE RÉFÉRENCES FORTES. Réponds en JSON objet avec les clés hook, context, demo, cta, pillar, hook_type.'
          : 'Génère exactement 1 script unique. Réponds en JSON objet avec les clés hook, context, demo, cta, pillar, hook_type.',
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Réponse OpenAI vide');

  const parsed = JSON.parse(content);
  let script = parsed.script && typeof parsed.script === 'object' ? parsed.script : parsed;

  // Dès qu'un capital argumentatif est fourni : si un nom de personne est cité sans profil explicite,
  // on ajoute la qualification (philosophe, chercheur, formateur, etc.) pour que le lecteur sache qui c'est.
  if ((capitalArgumentatif || '').trim()) {
    const personNames = extractLikelyPersonNames(capitalArgumentatif);
    if (scriptHasMissingPersonProfile(script, personNames)) {
      try {
        script = await rewriteScriptWithPersonProfiles(script, capitalArgumentatif);
      } catch (error) {
        // On conserve le script original en cas d'échec de la passe de réécriture.
      }
    }
    if (scriptHasMissingPersonProfile(script, personNames)) {
      try {
        script = enforcePersonProfiles(script, personNames, webProfiles);
      } catch (error) {
        script = enforcePersonProfiles(script, personNames, []);
      }
    }
  }

  script = sanitizeScriptBlocks(script);
  script = await fillEmptyScriptBlocks(script);

  return {
    hook: script.hook || '',
    context: script.context || '',
    demo: script.demo || '',
    cta: script.cta || '',
    pillar: script.pillar || null,
    hook_type: script.hook_type || null,
  };
}

/**
 * Génère les adaptations pour les 5 plateformes.
 * @param {object} script - { hook, context, demo, cta }
 * @returns {Promise<{tiktok, instagram, youtube, linkedin, twitter}>}
 */
async function generatePlatforms(script) {
  const userContent = `Script :\nHook: ${script.hook}\nContexte: ${script.context}\nDémo: ${script.demo}\nCTA: ${script.cta}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_PLATFORMS },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Réponse OpenAI vide');

  const result = JSON.parse(content);

  // Normalisation LinkedIn : le modèle peut renvoyer text/post/content au lieu de intro_text
  if (result.linkedin && typeof result.linkedin === 'object') {
    const li = result.linkedin;
    if (!li.intro_text && (li.text || li.post || li.content || li.description)) {
      li.intro_text = li.text || li.post || li.content || li.description || '';
    }
  }

  return result;
}

/**
 * Régénère un seul bloc (hook, context, demo, cta) ou une carte plateforme.
 * @param {string} type - 'hook' | 'context' | 'demo' | 'cta' | 'tiktok' | 'instagram' | 'youtube' | 'linkedin' | 'twitter'
 * @param {object} context - script actuel + éventuellement données plateforme
 * @returns {Promise<string|object>} - Nouveau texte ou objet plateforme
 */
async function regenerateOne(type, context) {
  const script = context.script || {};
  const isPlatform = ['tiktok', 'instagram', 'youtube', 'linkedin', 'twitter'].includes(type);

  if (isPlatform) {
    const full = await generatePlatforms(script);
    return full[type] || {};
  }

  const labels = {
    hook: 'HOOK (2-4s) — cible uniquement les services/fonctionnalités du produit, jamais la gestion de compte',
    context: 'CONTEXTE & PROBLÈME (élaboré, 5-15s) — problème concret détaillé, 2-4 phrases',
    demo: 'DÉMO & PREUVE (détaillée, 12-40s) — étapes à l\'écran précises, 3-6 phrases ou plus',
    cta: 'CTA (3-6s) — court, suppression du risque',
  };
  const label = labels[type] || type;

  const system = `Tu es un expert en scripts vidéo SaaS courts (25-60s). Tu écris en français, ton direct et conversationnel, pour voix off.
Réponds UNIQUEMENT avec le texte du bloc demandé, rien d'autre. Pas de titre, pas de guillemets superflus.`;

  const userContent = `Régénère uniquement le bloc "${label}" pour ce script. Le reste ne change pas.
Hook actuel: ${script.hook || ''}
Contexte actuel: ${script.context || ''}
Démo actuelle: ${script.demo || ''}
CTA actuel: ${script.cta || ''}

Génère uniquement le nouveau texte pour le bloc: ${label}.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  return text;
}

module.exports = {
  generate7Scripts,
  generateSingleScript,
  generatePlatforms,
  regenerateOne,
};
