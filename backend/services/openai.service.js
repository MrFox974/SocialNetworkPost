/**
 * Service OpenAI pour SpeechForge : génération de scripts et adaptations plateformes.
 * Utilise gpt-4o-mini.
 */
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT_7_SCRIPTS = `Tu es un expert en marketing vidéo court format pour la promotion d'applications SaaS en format faceless (screencast + voix off + sous-titres). Tu génères des scripts vidéo dont la durée totale est entre 25 et 60 secondes, structurés en 4 parties : HOOK (court), CONTEXTE & PROBLÈME (élaboré), DÉMO & PREUVE (détaillée), CTA (court).

{saasDescriptionBlock}

HOOK (2-4 secondes) — Cible UNIQUEMENT les services ou fonctionnalités concrètes proposées par le produit. Alterne entre : Problème (tu fais encore [X] ?), Stat choc (tu perds [X] par semaine), Affirmation audacieuse (la plupart des [pros] font [erreur]), Secret (l'outil que personne ne connaît). INTERDIT : ne parle JAMAIS de gestion de compte (création de mot de passe, déconnexion, inscription, connexion, paramètres compte, etc.). Chaque hook doit accrocher sur un service ou une feature précise du produit.

CONTEXTE & PROBLÈME (élaboré, 5-15 secondes) — Décris un seul problème concret mais en détail : qui est concerné, dans quelle situation, pourquoi c'est pénible ou coûteux. 2 à 4 phrases pour poser la situation et le problème de façon claire et identifiable. Pas de généralités vagues.

DÉMO & PREUVE (détaillée, 12-40 secondes) — Décris de façon précise et étape par étape ce que le spectateur verra à l'écran pendant le screencast : quelles actions, quels écrans, quel résultat. 3 à 6 phrases (ou plus si le script vise 45-60s). Montre comment le service / la fonctionnalité résout le problème. Sois concret (boutons, écrans, avant/après).

CTA (3-6 secondes) — Suppression du risque : gratuit, sans CB, essai rapide. Court et percutant.

Durée totale du speech : entre 25 et 60 secondes. Adapte la longueur du contexte et de la démo en conséquence.

Varie les piliers : Problème/Solution, Tutoriel rapide, Tips éducation, Myth-busting, Build-in-public.

Le ton est direct, énergique, conversationnel, en français. Le texte doit pouvoir être lu comme voix off.

IMPORTANT : ne génère JAMAIS un contenu similaire à ce qui existe déjà. Voici les scripts existants (propositions en cours) et déjà publiés (hooks et piliers) à ne pas dupliquer — utilise des angles et formulations distincts : {existingScriptsSummary}.

IMPORTANT — RÈGLE 40/30/30 : Parmi les 7 scripts à générer :
— Environ 3 (40%) : inspire-toi des scripts mis en ligne qui ont bien fonctionné (ci-dessous). Réutilise leur structure de hook, angle narratif, type de problème ou style de démo, avec de nouveaux exemples et formulations. Ne recopie jamais mot pour mot ni ne paraphraser de trop près : varie les formulations et les situations.
— Environ 2 (30%) : inspire-toi des scripts qui ont bien fonctionné OU des scripts en sélection (ci-dessous). Reprends leur angle ou leur idée mais AMÉLIORE la formulation : plus percutante, plus claire, plus engageante. Même fond, meilleure forme. Évite de reproduire les mêmes tournures que les scripts fournis.
— Environ 2 (30%) : angles, hooks et formulations ENTIÈREMENT ORIGINAUX. Ces 2 scripts doivent avoir des hooks, piliers et angles DIFFÉRENTS de tous les scripts de référence ci-dessous. Propose de vraies nouvelles idées, pas des variantes des références.

Scripts mis en ligne (bons scores) :
{topScriptsSummary}

Scripts en sélection (à améliorer en formulation) :
{selectionScriptsSummary}

Réponds uniquement en JSON valide : un objet avec une clé "scripts" contenant un tableau de 7 objets. Chaque objet a les clés : hook, context, demo, cta, pillar, hook_type. Pas de markdown, pas de \`\`\`json.`;

const SYSTEM_PROMPT_PLATFORMS = `Adapte ce script vidéo SaaS aux 5 plateformes. Voici le script : hook, contexte, démo, cta.

TikTok : légende casual et directe (max 300 car), 3-5 hashtags mix tendance/niche, CTA orienté commentaire ou follow.

Instagram Reels : légende orientée action, 3-5 hashtags ciblés, CTA orienté DM ou lien en bio.

YouTube Shorts : titre SEO (Comment… / Top X… / Pourquoi…), description longue riche en mots-clés, 3-5 hashtags SEO, CTA abonnement + lien en description.

LinkedIn : l'objet linkedin doit contenir OBLIGATOIREMENT la clé "intro_text" (texte principal du post, professionnel et éducatif, pas de promo directe), plus "hashtags" (2-3 sectoriels max) et "cta" (orienté discussion en commentaire). Pas d'autre clé pour le texte principal.

X/Twitter : tweet punchy max 280 car sans lien (pénalité algo), 1er commentaire séparé avec le lien, 1-2 hashtags max, CTA orienté RT ou engagement.

Réponds uniquement en JSON valide avec les clés : tiktok, instagram, youtube, linkedin, twitter. Structure attendue : tiktok/instagram = caption (ou legende), hashtags, cta ; youtube = title, description, hashtags, cta ; linkedin = intro_text, hashtags, cta ; twitter = tweet, first_comment, hashtags, cta. Pas de markdown, pas de \`\`\`json.`;

/**
 * Génère 7 propositions de scripts.
 * @param {string} existingScriptsSummary - Résumé des hooks/piliers existants à ne pas dupliquer
 * @param {string} topScriptsSummary - Résumé des scripts avec score >= 7
 * @param {string} selectionScriptsSummary - Résumé des scripts en sélection (pour les 30% à améliorer en formulation)
 * @param {string} saasDescription - Description du SaaS/app pour personnaliser les scripts
 * @returns {Promise<Array<{hook, context, demo, cta, pillar, hook_type}>>}
 */
async function generate7Scripts(existingScriptsSummary, topScriptsSummary, selectionScriptsSummary, saasDescription = '') {
  const saasDescriptionBlock = (saasDescription || '').trim()
    ? `DESCRIPTION DU PRODUIT / SAAS À PROMOUVOIR (tous les scripts doivent s'appuyer sur ce contexte) :\n${saasDescription.trim()}\n\n`
    : '';
  const system = SYSTEM_PROMPT_7_SCRIPTS
    .replace('{saasDescriptionBlock}', saasDescriptionBlock)
    .replace('{existingScriptsSummary}', existingScriptsSummary || 'Aucun script existant.')
    .replace('{topScriptsSummary}', (topScriptsSummary || '').trim() ? `\n${topScriptsSummary.trim()}\n` : 'Aucun script mis en ligne pour l\'instant.')
    .replace('{selectionScriptsSummary}', (selectionScriptsSummary || '').trim() ? `\n${selectionScriptsSummary.trim()}\n` : 'Aucun script en sélection.');

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: saasDescriptionBlock ? 'Génère 7 scripts différents pour ce produit.' : 'Génère 7 scripts différents.' },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Réponse OpenAI vide');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const match = content.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : { scripts: [] };
  }
  const list = Array.isArray(parsed) ? parsed : (parsed.scripts || parsed.list || []);
  if (list.length < 7) throw new Error(`Attendu 7 scripts, reçu ${list.length}`);
  return list.slice(0, 7);
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
  generatePlatforms,
  regenerateOne,
};
