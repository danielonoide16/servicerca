const db = require('../db/db');

// Perfil público del prestador: descripción, zona donde trabaja y oficios que ofrece (RF-03)
class PerfilPrestador {
  constructor(usuarioId, descripcion, zonaServicio, oficios) {
    this.usuarioId = usuarioId;
    this.descripcion = descripcion;
    this.zonaServicio = zonaServicio;
    this.oficios = oficios; // [{ id, nombre }]
  }

  static buscarPorUsuario(usuarioId) {
    const fila = db
      .prepare('SELECT usuario_id, descripcion, zona_servicio FROM perfiles_prestador WHERE usuario_id = ?')
      .get(usuarioId);
    if (!fila) return null;

    const oficios = db
      .prepare(
        `SELECT o.id, o.nombre
         FROM perfil_oficios po
         JOIN oficios o ON o.id = po.oficio_id
         WHERE po.usuario_id = ?
         ORDER BY o.nombre`,
      )
      .all(usuarioId);

    return new PerfilPrestador(fila.usuario_id, fila.descripcion, fila.zona_servicio, oficios);
  }

  static catalogoOficios() {
    return db.prepare('SELECT id, nombre FROM oficios ORDER BY nombre').all();
  }

  // Valida y guarda el perfil. Regresa la lista de errores (vacía si se guardó)
  actualizarPerfil(descripcion, zonaServicio, oficioIds) {
    const errores = [];
    if (oficioIds) oficioIds = [...new Set(oficioIds)]; // un oficio repetido en la petición se cuenta una sola vez

    if (!zonaServicio || zonaServicio.trim() === '') {
      errores.push('La zona de servicio es obligatoria');
    } else if (zonaServicio.trim().length > 100) {
      errores.push('La zona debe tener como máximo 100 caracteres');
    }

    if (descripcion && descripcion.trim().length > 500) {
      errores.push('La descripción debe tener como máximo 500 caracteres');
    }

    if (!oficioIds || oficioIds.length === 0) {
      errores.push('Selecciona al menos un oficio');
    } else {
      const validos = PerfilPrestador.catalogoOficios().map((o) => o.id);
      for (const id of oficioIds) {
        if (!validos.includes(id)) {
          errores.push('Uno de los oficios seleccionados no existe');
          break;
        }
      }
    }

    if (errores.length > 0) return errores;

    const guardar = db.transaction(() => {
      db.prepare(
        `INSERT INTO perfiles_prestador (usuario_id, descripcion, zona_servicio)
         VALUES (?, ?, ?)
         ON CONFLICT (usuario_id) DO UPDATE SET
           descripcion = excluded.descripcion,
           zona_servicio = excluded.zona_servicio`,
      ).run(this.usuarioId, descripcion ? descripcion.trim() : null, zonaServicio.trim());

      db.prepare('DELETE FROM perfil_oficios WHERE usuario_id = ?').run(this.usuarioId);
      const insertar = db.prepare('INSERT INTO perfil_oficios (usuario_id, oficio_id) VALUES (?, ?)');
      for (const id of oficioIds) insertar.run(this.usuarioId, id);
    });
    guardar();

    this.descripcion = descripcion ? descripcion.trim() : null;
    this.zonaServicio = zonaServicio.trim();
    this.oficios = PerfilPrestador.buscarPorUsuario(this.usuarioId).oficios;
    return [];
  }
}

module.exports = PerfilPrestador;
