const express = require('express');
const { requireRole, requireVerifiedEmail } = require('../middleware/requireAuth');
const SolicitudTrabajo = require('../clases/SolicitudTrabajo');
const Propuesta = require('../clases/Propuesta');
const CorreoNodemailer = require('../clases/CorreoNodemailer');

const router = express.Router();

// aquí se decide con qué servicio salen los avisos. para cambiar de proveedor solo se cambia esta línea
const servicioCorreo = new CorreoNodemailer();

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

  const { errores } = await Propuesta.enviar(solicitud, req.user.id, precio, disponibilidad, mensaje, servicioCorreo);
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

// rf-08: el cliente acepta una propuesta y la solicitud queda asignada
router.post('/:id/aceptar', requireRole('cliente'), async (req, res) => {
  const id = Number(req.params.id);
  const propuesta = Number.isInteger(id) && id > 0 ? Propuesta.buscarPorId(id) : null;
  if (!propuesta) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa propuesta' });
  }

  const error = await propuesta.aceptar(req.user.id, servicioCorreo);
  if (error) {
    const solicitud = SolicitudTrabajo.buscarPorId(propuesta.solicitudId);
    const status = solicitud.clienteId !== req.user.id ? 403 : 409;
    return res.status(status).render('error', { status, message: error });
  }
  res.redirect('/solicitudes/' + propuesta.solicitudId + '?aceptada=1');
});

module.exports = router;
