import api from '../../utils/api';

/**
 * Génère un seul script (pour progression réelle).
 * @param {object} params - Mêmes paramètres que generateProposals + currentBatchSummary
 * @returns {Promise<object>} - Un script { hook, context, demo, cta, pillar, hook_type }
 */
export async function generateOneProposal(params) {
  const { data } = await api.post('/api/speeches/generate-one-proposal', params);
  return data.script;
}

export async function generateProposals(
  existingScriptsSummary = '',
  topScriptsSummary = '',
  selectionScriptsSummary = '',
  saasDescription = '',
  capitalArgumentatif = '',
  argumentativeIntensity = 'moyenne'
) {
  const { data } = await api.post('/api/speeches/generate-proposals', {
    existingScriptsSummary,
    topScriptsSummary,
    selectionScriptsSummary,
    saasDescription,
    capitalArgumentatif,
    argumentativeIntensity,
  });
  return data.scripts;
}

export async function generatePlatforms(script) {
  const { data } = await api.post('/api/speeches/generate-platforms', {
    hook: script.hook,
    context: script.context,
    demo: script.demo,
    cta: script.cta,
  });
  return data;
}

export async function regenerate(type, script) {
  const { data } = await api.post('/api/speeches/regenerate', { type, script });
  return data.result;
}
