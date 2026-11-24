const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const PerfilPrestador = require('../clases/PerfilPrestador');

const router = express.Router();

function mostrarFormulario(res, status, usuario, descripcion, zonaServicio, oficiosElegidos, catalogo, errores, guardado) {
  res.status(status).render('perfil/editar', {
    titulo: 'Mi perfil',
    usuario,
    descripcion,
    zonaServicio,
    oficiosElegidos,
    catalogo,
    errores,
    guardado,
  });
}

// RF-03: ver el perfil
router.get('/', requireAuth, (req, res) => {
  if (req.user.rol !== 'prestador') {
    return res.status(403).render('error', { status: 403, message: 'Solo los prestadores tienen perfil' });
  }

  const perfil = PerfilPrestador.buscarPorUsuario(req.user.id);
  const catalogo = PerfilPrestador.catalogoOficios();

  if (perfil) {
    mostrarFormulario(
      res, 200, req.user, perfil.descripcion || '', perfil.zonaServicio,
      perfil.oficios.map((o) => o.id), catalogo, [], req.query.guardado === '1',
    );
  } else {
    mostrarFormulario(res, 200, req.user, '', '', [], catalogo, [], false);
  }
});

// RF-03: guardar el perfil
router.post('/', requireAuth, (req, res) => {
  if (req.user.rol !== 'prestador') {
    return res.status(403).render('error', { status: 403, message: 'Solo los prestadores tienen perfil' });
  }

  const body = req.body || {};
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion : '';
  const zonaServicio = typeof body.zona === 'string' ? body.zona : '';

  // las casillas llegan como texto si se marca una y como arreglo si se marcan varias
  let oficioIds = [];
  if (Array.isArray(body.oficios)) {
    oficioIds = body.oficios.map((o) => Number(o));
  } else if (typeof body.oficios === 'string' && body.oficios !== '') {
    oficioIds = [Number(body.oficios)];
  }

  const catalogo = PerfilPrestador.catalogoOficios();
  let perfil = PerfilPrestador.buscarPorUsuario(req.user.id);
  if (!perfil) {
    perfil = new PerfilPrestador(req.user.id, null, null, []);
  }

  const errores = perfil.actualizarPerfil(descripcion, zonaServicio, oficioIds);
  if (errores.length > 0) {
    return mostrarFormulario(res, 400, req.user, descripcion, zonaServicio, oficioIds, catalogo, errores, false);
  }

  res.redirect('/perfil?guardado=1');
});

module.exports = router;
