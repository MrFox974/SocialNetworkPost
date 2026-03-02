import api from '../../utils/api';

export async function generateProposals(
  existingScriptsSummary = '',
  topScriptsSummary = '',
  selectionScriptsSummary = '',
  saasDescription = ''
) {
  const { data } = await api.post('/api/speeches/generate-proposals', {
    existingScriptsSummary,
    topScriptsSummary,
    selectionScriptsSummary,
    saasDescription,
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
