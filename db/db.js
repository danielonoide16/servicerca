require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { migrar } = require('./migrate');

// Ruta del archivo SQLite: variable DATABASE_PATH (relativa a la raíz del proyecto o absoluta)
const RAIZ = path.join(__dirname, '..');
const ruta = path.resolve(RAIZ, process.env.DATABASE_PATH || 'db/servicerca.db');

fs.mkdirSync(path.dirname(ruta), { recursive: true });
const db = new Database(ruta);
db.pragma('foreign_keys = ON');
const nuevas = migrar(db);

module.exports = db;
module.exports.rutaArchivo = ruta;
module.exports.migracionesNuevas = nuevas;
