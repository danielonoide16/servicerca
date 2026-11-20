const db = require('./db');

// Deja un solo token vigente por usuario y propósito: borra los anteriores y guarda el nuevo
const reemplazar = db.transaction((usuarioId, proposito, tokenHash, expiraEn) => {
  db.prepare('DELETE FROM tokens_un_solo_uso WHERE usuario_id = ? AND proposito = ?').run(usuarioId, proposito);
  db.prepare(
    'INSERT INTO tokens_un_solo_uso (usuario_id, proposito, token_hash, expira_en) VALUES (?, ?, ?, ?)',
  ).run(usuarioId, proposito, tokenHash, expiraEn);
});

// Marca el token como usado solo si existe, es del propósito, no se ha usado y no ha expirado.
// Devuelve el id del usuario, o null si no se pudo usar.
function marcarUsado(tokenHash, proposito, ahoraISO) {
  const resultado = db
    .prepare(
      `UPDATE tokens_un_solo_uso SET usado_en = ?
       WHERE token_hash = ? AND proposito = ? AND usado_en IS NULL AND expira_en > ?`,
    )
    .run(ahoraISO, tokenHash, proposito, ahoraISO);
  if (resultado.changes !== 1) return null;
  return db.prepare('SELECT usuario_id FROM tokens_un_solo_uso WHERE token_hash = ?').get(tokenHash).usuario_id;
}

module.exports = { reemplazar, marcarUsado };
