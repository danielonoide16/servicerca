const log = require('../utils/log');

// 404 para rutas que no existen
function notFound(req, res) {
  res.status(404).render('error', { status: 404, message: 'Página no encontrada' });
}

// Manejador de errores: debe registrarse al final, después de todas las rutas.
// El detalle técnico solo se escribe en la consola, nunca en la respuesta.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  log.error('Error en ' + req.method + ' ' + req.path + ':', err);
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Error interno del servidor';
  if (err.status === 400) {
    status = 400;
    message = 'Solicitud inválida';
  } else if (err.status === 413) {
    status = 413;
    message = 'La petición es demasiado grande';
  }
  res.status(status).render('error', { status, message });
}

module.exports = { notFound, errorHandler };
