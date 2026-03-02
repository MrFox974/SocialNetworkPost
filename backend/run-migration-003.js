/**
 * Exécute la migration 003-auth-production.sql (colonnes users + table pending_registrations).
 * Usage : node run-migration-003.js
 */
require('dotenv').config();
const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, 'migrations', '003-auth-production.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Enlever les commentaires et exécuter chaque instruction (ALTER/CREATE) séparément
const statements = sql
  .split(';')
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter((s) => s.length > 0);

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connexion DB OK.');
    for (const statement of statements) {
      const st = statement + ';';
      try {
        await sequelize.query(st);
        console.log('OK:', st.slice(0, 60) + '...');
      } catch (err) {
        if (err.original && err.original.code === '42701') {
          console.log('Déjà présent (ignoré):', st.slice(0, 50) + '...');
        } else {
          throw err;
        }
      }
    }
    console.log('Migration 003 terminée.');
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
