const express = require('express');
const { requireAuth, requireRole, requireVerifiedEmail } = require('../middleware/requireAuth');
const SolicitudTrabajo = require('../clases/SolicitudTrabajo');
const Resena = require('../clases/Resena');
const Propuesta = require('../clases/Propuesta');

const router = express.Router();

const texto = (valor) => (typeof valor === 'string' ? valor : '');

// Lee el :id de la ruta y carga la solicitud. Si no existe responde 404 y regresa null.
function cargarSolicitud(req, res) {
  const id = Number(req.params.id);
  const solicitud = Number.isInteger(id) && id > 0 ? SolicitudTrabajo.buscarPorId(id) : null;
  if (!solicitud) {
    res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
    return null;
  }
  return solicitud;
}

// RF-05: el prestador busca solicitudes publicadas por oficio y zona
router.get('/', requireRole('prestador'), (req, res) => {
  const oficioId = Number(texto(req.query.oficio)) || null;
  const zona = texto(req.query.zona);
  res.render('solicitudes/buscar', {
    titulo: 'Buscar solicitudes',
    solicitudes: SolicitudTrabajo.buscar(oficioId, zona),
    catalogo: SolicitudTrabajo.catalogoOficios(),
    filtros: { oficioId, zona },
  });
});

// RF-04: formulario para publicar una solicitud
router.get('/nueva', requireRole('cliente'), requireVerifiedEmail, (req, res) => {
  res.render('solicitudes/nueva', {
    titulo: 'Nueva solicitud',
    catalogo: SolicitudTrabajo.catalogoOficios(),
    valores: { oficioId: null, descripcion: '', zona: '' },
    errores: [],
  });
});

// RF-04: publicar la solicitud
router.post('/', requireRole('cliente'), requireVerifiedEmail, (req, res) => {
  const oficioId = Number(texto(req.body.oficio)) || null;
  const descripcion = texto(req.body.descripcion);
  const zona = texto(req.body.zona);

  const { errores } = SolicitudTrabajo.publicar(req.user.id, oficioId, descripcion, zona);
  if (errores.length > 0) {
    return res.status(400).render('solicitudes/nueva', {
      titulo: 'Nueva solicitud',
      catalogo: SolicitudTrabajo.catalogoOficios(),
      valores: { oficioId, descripcion, zona },
      errores,
    });
  }
  res.redirect('/solicitudes/mias?publicada=1');
});

// Solicitudes del cliente, con las acciones de completar, cancelar y reseñar
router.get('/mias', requireRole('cliente'), (req, res) => {
  const solicitudes = SolicitudTrabajo.delCliente(req.user.id);
  const conResena = new Set(
    solicitudes.filter((s) => s.puedeResenarse() && Resena.buscarPorSolicitud(s.id)).map((s) => s.id),
  );
  res.render('solicitudes/mias', {
    titulo: 'Mis solicitudes',
    solicitudes,
    conResena,
    aviso: texto(req.query.publicada) === '1' ? 'Tu solicitud se publicó correctamente.'
      : texto(req.query.completada) === '1' ? 'La solicitud quedó como completada. Ya puedes dejar tu reseña.'
        : texto(req.query.cancelada) === '1' ? 'La solicitud se canceló.'
          : texto(req.query.resena) === '1' ? 'Gracias, tu reseña se guardó.'
            : null,
  });
});

// Detalle de una solicitud. La ve su cliente, y los prestadores mientras está publicada.
router.get('/:id', requireAuth, (req, res) => {
  const solicitud = cargarSolicitud(req, res);
  if (!solicitud) return;

  const esDueno = solicitud.clienteId === req.user.id;
  const prestadorPuedeVer = req.user.rol === 'prestador' && solicitud.estado === 'Publicada';
  if (!esDueno && !prestadorPuedeVer) {
    return res.status(403).render('error', { status: 403, message: 'No tienes permiso para ver esta solicitud' });
  }

  res.render('solicitudes/detalle', {
    titulo: 'Solicitud de ' + solicitud.oficio,
    solicitud,
    esDueno,
    resena: Resena.buscarPorSolicitud(solicitud.id),
    // rf-07: solo el cliente dueño ve las propuestas que recibió
    propuestas: esDueno ? Propuesta.deSolicitud(solicitud.id) : [],
    yaPropuso: req.user.rol === 'prestador' && Propuesta.yaEnvio(solicitud.id, req.user.id),
    aviso: texto(req.query.enviada) === '1' ? 'Tu propuesta se envió. El cliente la verá en su solicitud.' : null,
  });
});

// RF-09: marcar como completada
router.post('/:id/completar', requireRole('cliente'), (req, res) => {
  const solicitud = cargarSolicitud(req, res);
  if (!solicitud) return;

  const error = solicitud.completar(req.user.id);
  if (error) {
    const status = solicitud.clienteId !== req.user.id ? 403 : 409;
    return res.status(status).render('error', { status, message: error });
  }
  res.redirect('/solicitudes/mias?completada=1');
});

// RF-10: cancelar
router.post('/:id/cancelar', requireRole('cliente'), (req, res) => {
  const solicitud = cargarSolicitud(req, res);
  if (!solicitud) return;

  const error = solicitud.cancelar(req.user.id);
  if (error) {
    const status = solicitud.clienteId !== req.user.id ? 403 : 409;
    return res.status(status).render('error', { status, message: error });
  }
  res.redirect('/solicitudes/mias?cancelada=1');
});

module.exports = router;
