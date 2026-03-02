/**
 * Exécute la migration 004-subscriptions.sql (colonnes abonnement Stripe sur users).
 * Usage : node run-migration-004.js
 * Connexion : backend/.env (DATABASE_*). En prod (Supabase), utiliser les variables d'environnement de prod.
 */
require('dotenv').config();
const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, 'migrations', '004-subscriptions.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

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
    console.log('Migration 004 terminée.');
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
