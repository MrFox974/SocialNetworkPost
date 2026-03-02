import api from '../../utils/api';

export async function getProjects() {
  const { data } = await api.get('/api/projects');
  return data.projects || [];
}

export async function getProject(id) {
  const { data } = await api.get(`/api/projects/${id}`);
  return data;
}

export async function createProject(name = 'Nouveau projet', saasPrompt = '') {
  const { data } = await api.post('/api/projects', { name, saas_prompt: saasPrompt });
  return data;
}

export async function updateProject(id, { name, saas_prompt }) {
  const { data } = await api.put(`/api/projects/${id}`, { name, saas_prompt });
  return data;
}

export async function deleteProject(id) {
  await api.delete(`/api/projects/${id}`);
}
