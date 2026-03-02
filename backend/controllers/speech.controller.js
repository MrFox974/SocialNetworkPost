const openaiService = require('../services/openai.service');

function isOpenAIQuotaError(error) {
  const status = error.status || error.response?.status;
  const code = error.code || error.error?.code;
  return status === 429 || code === 'insufficient_quota' || code === 'rate_limit_exceeded';
}

function openAIErrorMessage(error) {
  if (isOpenAIQuotaError(error)) {
    return 'Quota OpenAI dépassée. Vérifie ton plan et ta facturation sur platform.openai.com.';
  }
  return error.message || 'Erreur lors de l\'appel OpenAI';
}

/**
 * POST /api/speeches/generate-proposals
 * Body: { existingScriptsSummary?, topScriptsSummary?, selectionScriptsSummary?, saasDescription? }
 * req.user_id fourni par authMiddlewares (JWT backend)
 */
exports.generateProposals = async (req, res) => {
  try {
    const {
      existingScriptsSummary = '',
      topScriptsSummary = '',
      selectionScriptsSummary = '',
      saasDescription = '',
    } = req.body || {};
    const scripts = await openaiService.generate7Scripts(
      existingScriptsSummary,
      topScriptsSummary,
      selectionScriptsSummary,
      saasDescription
    );
    res.json({ scripts });
  } catch (error) {
    console.error('Erreur generateProposals:', error);
    const status = isOpenAIQuotaError(error) ? 503 : 500;
    res.status(status).json({
      error: isOpenAIQuotaError(error) ? openAIErrorMessage(error) : 'Erreur lors de la génération des scripts',
      details: error.message,
    });
  }
};

/**
 * POST /api/speeches/generate-platforms
 * Body: { hook, context, demo, cta }
 */
exports.generatePlatforms = async (req, res) => {
  try {
    const { hook, context, demo, cta } = req.body || {};
    if (!hook || !context || !demo || !cta) {
      return res.status(400).json({
        error: 'hook, context, demo et cta sont requis',
      });
    }
    const platforms = await openaiService.generatePlatforms({
      hook,
      context,
      demo,
      cta,
    });
    res.json(platforms);
  } catch (error) {
    console.error('Erreur generatePlatforms:', error);
    const status = isOpenAIQuotaError(error) ? 503 : 500;
    res.status(status).json({
      error: isOpenAIQuotaError(error) ? openAIErrorMessage(error) : 'Erreur lors de la génération des plateformes',
      details: error.message,
    });
  }
};

/**
 * POST /api/speeches/regenerate
 * Body: { type: 'hook'|'context'|'demo'|'cta'|'tiktok'|..., script: { hook, context, demo, cta } }
 */
exports.regenerate = async (req, res) => {
  try {
    const { type, script = {} } = req.body || {};
    if (!type) {
      return res.status(400).json({ error: 'type est requis' });
    }
    const result = await openaiService.regenerateOne(type, { script });
    res.json({ result });
  } catch (error) {
    console.error('Erreur regenerate:', error);
    const status = isOpenAIQuotaError(error) ? 503 : 500;
    res.status(status).json({
      error: isOpenAIQuotaError(error) ? openAIErrorMessage(error) : 'Erreur lors de la régénération',
      details: error.message,
    });
  }
};
