const Speech = require('../models/Speech');

/**
 * GET /api/speeches - Liste des speeches de l'utilisateur
 */
exports.list = async (req, res) => {
  try {
    const where = { user_id: req.user_id };
    if (req.query.project_id) where.project_id = req.query.project_id;
    const list = await Speech.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
    res.json({ speeches: list });
  } catch (error) {
    console.error('Erreur list speeches:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * GET /api/speeches/:id - Un speech par id
 */
exports.getOne = async (req, res) => {
  try {
    const speech = await Speech.findOne({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!speech) {
      return res.status(404).json({ error: 'Script non trouvé' });
    }
    res.json(speech.get({ plain: true }));
  } catch (error) {
    console.error('Erreur getOne speech:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * POST /api/speeches - Créer un ou plusieurs speeches
 * Body: { speeches: [{ hook, context, demo, cta, hook_type?, pillar? }] } ou un seul objet
 */
exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    const { project_id } = body;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id requis' });
    }
    const items = Array.isArray(body.speeches) ? body.speeches : (body.hook ? [body] : []);
    if (items.length === 0) {
      return res.status(400).json({ error: 'Données invalides (hook, context, demo, cta requis)' });
    }
    const created = await Speech.bulkCreate(
      items.map((s) => ({
        user_id: req.user_id,
        project_id,
        status: 'draft',
        hook: s.hook || '',
        hook_type: s.hook_type || null,
        context: s.context || '',
        demo: s.demo || '',
        cta: s.cta || '',
        pillar: s.pillar || null,
      }))
    );
    res.status(201).json(Array.isArray(created) ? created : [created]);
  } catch (error) {
    console.error('Erreur create speeches:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * PUT /api/speeches/:id - Mettre à jour un speech
 */
exports.update = async (req, res) => {
  try {
    const speech = await Speech.findOne({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!speech) {
      return res.status(404).json({ error: 'Script non trouvé' });
    }
    const allowed = [
      'status',
      'in_selection',
      'selection_marked',
      'hook',
      'hook_type',
      'context',
      'demo',
      'cta',
      'pillar',
      'tiktok',
      'instagram',
      'youtube',
      'linkedin',
      'twitter',
      'score',
      'published_at',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await speech.update(updates);
    res.json(speech);
  } catch (error) {
    console.error('Erreur update speech:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * DELETE /api/speeches/:id
 */
exports.delete = async (req, res) => {
  try {
    const speech = await Speech.findOne({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!speech) {
      return res.status(404).json({ error: 'Script non trouvé' });
    }
    await speech.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erreur delete speech:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
