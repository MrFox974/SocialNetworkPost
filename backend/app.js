require('dotenv').config()

// Trigger redeploy
const express = require('express')
const app = express()
const { connectToDB, connectModels } = require('./config/database')
const cors = require('cors')

// Configuration CORS : whitelist d'origines autorisées (strict)
// - CORS_ORIGIN peut contenir plusieurs origines séparées par des virgules
// - FRONTEND_URL peut servir d'origine autorisée (ex. pour liens emails + app)
// - CLIENT_IP (host Amplify) est converti en https://<host>
// Retire le slash final pour matcher l'en-tête Origin envoyé par le navigateur (sans slash)
const normalizeOrigin = (value) => (value || '').trim().replace(/\/$/, '');

const allowedOrigins = [
  ...(process.env.CORS_ORIGIN || '').split(',').map(normalizeOrigin).filter(Boolean),
  normalizeOrigin(process.env.FRONTEND_URL),
  process.env.CLIENT_IP ? normalizeOrigin(`https://${process.env.CLIENT_IP}`) : '',
  // Fallback dev local si aucune variable n'est fournie
  'http://localhost:5173',
].filter(Boolean);

console.log('CORS Configuration - Allowed Origins:', allowedOrigins);

const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(normalizeOrigin(origin));

// Un seul middleware CORS pour éviter le header Access-Control-Allow-Origin en double
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins);
    // Pas d'Origin ou origine autorisée → accepter
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
// Ne pas toucher à extended: true, ça peut causer des problèmes avec les données de la BDD.

require('./models/Test');
require('./models/User');
require('./models/PendingRegistration');
require('./models/Project');
require('./models/Speech');

app.use('/api', require('./router/test.route'));
app.use('/api/auth', require('./router/auth.route'));
app.use('/api/projects', require('./router/projects.route'));
app.use('/api/speeches', require('./router/speeches.route'));
app.use('/api/payment', require('./router/payment.route'));

// Middleware de gestion d'erreur global
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  const origin = req.headers.origin;
  const originNormalized = (origin || '').trim().replace(/\/$/, '');
  const ok = !origin || allowedOrigins.includes(originNormalized);

  // Ajoute les headers CORS même en cas d'erreur
  if (ok && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Initialise la connexion DB (non-bloquant pour Lambda) test
connectToDB().catch(err => {
  console.error('Failed to connect to database:', err);
});

connectModels({ force: false }).catch(err => {
  console.error('Failed to sync models:', err);
});

module.exports = app