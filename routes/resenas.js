const express = require('express');
const { requireRole } = require('../middleware/requireAuth');
const SolicitudTrabajo = require('../clases/SolicitudTrabajo');
const Resena = require('../clases/Resena');

const router = express.Router();

function cargarSolicitud(req, res) {
  const id = Number(req.params.solicitudId);
  const solicitud = Number.isInteger(id) && id > 0 ? SolicitudTrabajo.buscarPorId(id) : null;
  if (!solicitud) {
    res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
    return null;
  }
  if (solicitud.clienteId !== req.user.id) {
    res.status(403).render('error', { status: 403, message: 'No tienes permiso para reseñar esta solicitud' });
    return null;
  }
  return solicitud;
}

// RF-11: formulario de la reseña
router.get('/nueva/:solicitudId', requireRole('cliente'), (req, res) => {
  const solicitud = cargarSolicitud(req, res);
  if (!solicitud) return;

  if (Resena.buscarPorSolicitud(solicitud.id)) {
    return res.redirect('/solicitudes/' + solicitud.id);
  }
  if (!solicitud.puedeResenarse()) {
    return res.status(409).render('error', { status: 409, message: 'Solo puedes reseñar una solicitud completada' });
  }

  res.render('resenas/nueva', {
    titulo: 'Dejar reseña',
    solicitud,
    valores: { calificacion: null, comentario: '' },
    errores: [],
  });
});

// RF-11: guardar la reseña
router.post('/nueva/:solicitudId', requireRole('cliente'), (req, res) => {
  const solicitud = cargarSolicitud(req, res);
  if (!solicitud) return;

  const calificacion = Number(typeof req.body.calificacion === 'string' ? req.body.calificacion : '');
  const comentario = typeof req.body.comentario === 'string' ? req.body.comentario : '';

  const { errores } = Resena.registrar(solicitud, req.user.id, calificacion, comentario);
  if (errores.length > 0) {
    return res.status(400).render('resenas/nueva', {
      titulo: 'Dejar reseña',
      solicitud,
      valores: { calificacion, comentario },
      errores,
    });
  }
  res.redirect('/solicitudes/mias?resena=1');
});

module.exports = router;
