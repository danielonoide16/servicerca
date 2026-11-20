// Ejecutor de migraciones. Aplica, en orden, los archivos db/migrations/NNN_nombre.sql
// que todavía no se hayan aplicado y los registra en la tabla schema_migrations.
//   - Cada migración corre dentro de una transacción: si falla, no queda a medias.
//   - Se guarda el checksum (sha256) de cada archivo aplicado. Una migración ya aplicada
//     no se edita: cualquier cambio nuevo va en un archivo nuevo.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, 'migrations');
const PATRON = /^\d{3}_[a-z0-9_]+\.sql$/;

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

function listarArchivos() {
  return fs.readdirSync(CARPETA).filter((f) => PATRON.test(f)).sort();
}

// Devuelve la lista de migraciones aplicadas en esta llamada
function migrar(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    checksum    TEXT NOT NULL,
    aplicada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const aplicadas = new Map(
    db.prepare('SELECT version, checksum FROM schema_migrations').all().map((m) => [m.version, m.checksum]),
  );

  // Base creada con el esquema anterior (antes de existir las migraciones)
  const hayTablas = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'").get();
  if (aplicadas.size === 0 && hayTablas) {
    throw new Error(
      'La base de datos tiene tablas de una versión anterior y no está versionada. ' +
      'Borra el archivo de la base (por defecto db/servicerca.db) y vuelve a iniciar.',
    );
  }

  const nuevas = [];
  for (const archivo of listarArchivos()) {
    const version = archivo.replace(/\.sql$/, '');
    const sql = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
    const checksum = sha256(sql.replace(/\r\n/g, '\n'));

    if (aplicadas.has(version)) {
      if (aplicadas.get(version) !== checksum) {
        throw new Error(
          `La migración ${archivo} ya se aplicó y fue modificada. ` +
          'No se editan migraciones aplicadas: crea una nueva, o borra la base de datos si aún no hay datos que conservar.',
        );
      }
      continue;
    }

    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)').run(version, checksum);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      err.message = `Falló la migración ${archivo}: ${err.message}`;
      throw err;
    }
    nuevas.push(version);
  }
  return nuevas;
}

module.exports = { migrar, listarArchivos };

// npm run migrate: abre la base (db.js migra al cargarse) y muestra el estado
if (require.main === module) {
  const db = require('./db');
  const filas = db.prepare('SELECT version, aplicada_en FROM schema_migrations ORDER BY version').all();
  console.log('Migraciones aplicadas:');
  for (const f of filas) console.log(`  ${f.version}  (${f.aplicada_en})`);
  db.close();
}
