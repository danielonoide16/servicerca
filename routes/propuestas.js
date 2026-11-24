const express = require('express');
const { requireRole, requireVerifiedEmail } = require('../middleware/requireAuth');
const SolicitudTrabajo = require('../clases/SolicitudTrabajo');
const Propuesta = require('../clases/Propuesta');

const router = express.Router();

const texto = (valor) => (typeof valor === 'string' ? valor : '');

// el historial del prestador ya muestra sus propuestas con su estado (rf-12)
router.get('/', requireRole('prestador'), (req, res) => {
  res.redirect('/historial');
});

// rf-06: formulario para mandar una propuesta
router.get('/nueva/:solicitudId', requireRole('prestador'), requireVerifiedEmail, (req, res) => {
  const id = Number(req.params.solicitudId);
  const solicitud = Number.isInteger(id) && id > 0 ? SolicitudTrabajo.buscarPorId(id) : null;
  if (!solicitud) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
  }
  if (solicitud.estado !== 'Publicada') {
    return res.status(409).render('error', { status: 409, message: 'Esta solicitud ya no recibe propuestas' });
  }
  if (Propuesta.yaEnvio(solicitud.id, req.user.id)) {
    return res.redirect('/solicitudes/' + solicitud.id);
  }

  res.render('propuestas/nueva', {
    titulo: 'Enviar propuesta',
    solicitud,
    valores: { precio: '', disponibilidad: '', mensaje: '' },
    errores: [],
  });
});

// rf-06: guardar la propuesta
router.post('/nueva/:solicitudId', requireRole('prestador'), requireVerifiedEmail, async (req, res) => {
  const id = Number(req.params.solicitudId);
  const solicitud = Number.isInteger(id) && id > 0 ? SolicitudTrabajo.buscarPorId(id) : null;
  if (!solicitud) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
  }

  const precio = Number(texto(req.body.precio));
  const disponibilidad = texto(req.body.disponibilidad);
  const mensaje = texto(req.body.mensaje);

  const { errores } = await Propuesta.enviar(solicitud, req.user.id, precio, disponibilidad, mensaje);
  if (errores.length > 0) {
    return res.status(400).render('propuestas/nueva', {
      titulo: 'Enviar propuesta',
      solicitud,
      valores: { precio: texto(req.body.precio), disponibilidad, mensaje },
      errores,
    });
  }
  res.redirect('/solicitudes/' + solicitud.id + '?enviada=1');
});

module.exports = router;
