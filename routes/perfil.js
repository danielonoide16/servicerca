const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const PerfilPrestador = require('../clases/PerfilPrestador');

const router = express.Router();

// Solo los prestadores tienen perfil
function soloPrestadores(req, res, next) {
  if (req.user.rol !== 'prestador') {
    return res.status(403).render('error', { status: 403, message: 'Solo los prestadores tienen perfil' });
  }
  next();
}

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
router.get('/', requireAuth, soloPrestadores, (req, res) => {
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
router.post('/', requireAuth, soloPrestadores, (req, res) => {
  const descripcion = typeof req.body.descripcion === 'string' ? req.body.descripcion : '';
  const zonaServicio = typeof req.body.zona === 'string' ? req.body.zona : '';

  // las casillas llegan como texto si se marca una y como arreglo si se marcan varias
  let oficioIds = [];
  if (Array.isArray(req.body.oficios)) {
    oficioIds = req.body.oficios.map((o) => Number(o));
  } else if (typeof req.body.oficios === 'string' && req.body.oficios !== '') {
    oficioIds = [Number(req.body.oficios)];
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
