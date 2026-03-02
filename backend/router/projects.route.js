const express = require('express');
const controller = require('../controllers/projects.controller');
const { authMiddlewares } = require('../middlewares/authMiddlewares');

const route = express.Router();
route.use(authMiddlewares);

route.get('/', controller.list);
route.get('/:id', controller.getOne);
route.post('/', controller.create);
route.put('/:id', controller.update);
route.delete('/:id', controller.delete);

module.exports = route;
