const usuarios = require('../db/usuarioModel');

// Carga la cuenta de la sesión desde la base de datos en cada petición (req.user).
// Así un cambio de rol o una cuenta eliminada se notan de inmediato.
function cargarUsuario(req, res, next) {
  req.user = null;
  const id = req.session && req.session.usuarioId;
  if (id) {
    const usuario = usuarios.buscarPorId(id);
    if (usuario) {
      req.user = usuario;
    } else {
      delete req.session.usuarioId;
    }
  }
  res.locals.usuario = req.user;
  next();
}

module.exports = cargarUsuario;
