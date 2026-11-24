const Usuario = require('../clases/Usuario');

// Carga la cuenta de la sesión desde la base de datos en cada petición (req.user).
// Así un cambio de rol o una cuenta eliminada se notan de inmediato.
function cargarUsuario(req, res, next) {
  req.user = null;
  const id = req.session && req.session.usuarioId;
  if (id) {
    const usuario = Usuario.buscarPorId(id);
    if (usuario) {
      req.user = usuario.datosPublicos();
    } else {
      delete req.session.usuarioId;
    }
  }
  res.locals.usuario = req.user;
  next();
}

module.exports = cargarUsuario;
