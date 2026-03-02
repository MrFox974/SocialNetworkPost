const express = require('express');
const controller = require('../controllers/speech.controller');

const route = express.Router();

route.post('/generate-proposals', controller.generateProposals);
route.post('/generate-platforms', controller.generatePlatforms);
route.post('/regenerate', controller.regenerate);

module.exports = route;
