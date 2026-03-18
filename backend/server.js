// server.js (dev local) test
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || process.env.SERVER_PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});