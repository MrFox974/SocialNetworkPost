const Project = require('../models/Project');
const Speech = require('../models/Speech');

exports.list = async (req, res) => {
  try {
    const list = await Project.findAll({
      where: { user_id: req.user_id },
      order: [['created_at', 'DESC']],
    });
    res.json({ projects: list });
  } catch (error) {
    console.error('Erreur list projects:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    res.json(project);
  } catch (error) {
    console.error('Erreur getOne project:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name = 'Nouveau projet', saas_prompt = '' } = req.body || {};
    const project = await Project.create({
      user_id: req.user_id,
      name: String(name).trim() || 'Nouveau projet',
      saas_prompt: String(saas_prompt || '').trim(),
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('Erreur create project:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    const { name, saas_prompt } = req.body || {};
    if (name !== undefined) project.name = String(name).trim() || project.name;
    if (saas_prompt !== undefined) project.saas_prompt = String(saas_prompt || '').trim();
    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Erreur update project:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    await project.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erreur delete project:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
