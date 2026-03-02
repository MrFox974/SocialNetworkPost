const express = require('express');
const speechesController = require('../controllers/speeches.controller');
const speechController = require('../controllers/speech.controller');
const { authMiddlewares } = require('../middlewares/authMiddlewares');

const route = express.Router();

route.use(authMiddlewares);

route.get('/', speechesController.list);
route.post('/', speechesController.create);
route.post('/generate-proposals', speechController.generateProposals);
route.post('/generate-platforms', speechController.generatePlatforms);
route.post('/regenerate', speechController.regenerate);
route.get('/:id', speechesController.getOne);
route.put('/:id', speechesController.update);
route.delete('/:id', speechesController.delete);

module.exports = route;
