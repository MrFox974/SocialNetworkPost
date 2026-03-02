const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

const authMiddlewares = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token!' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {

  if (err) return res.status(401).json({ error: 'Token expired or invalid!' });


req.user_id = decoded.user_id;

    next();
  });
}

module.exports = { authMiddlewares }