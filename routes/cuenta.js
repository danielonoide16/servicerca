// Verificación de correo y recuperación de contraseña
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const ctrl = require('../controllers/cuentaController');

const router = express.Router();

// Verificar correo: el enlace del correo abre la página y el botón envía el POST
router.get('/verificar-correo', ctrl.verVerificar);
router.post('/verificar-correo', ctrl.verificarVista);
router.post('/reenviar-verificacion', requireAuth, ctrl.reenviarVista);

// Recuperar contraseña
router.get('/olvide-contrasena', ctrl.verOlvide);
router.post('/olvide-contrasena', ctrl.olvideVista);
router.get('/restablecer-contrasena', ctrl.verRestablecer);
router.post('/restablecer-contrasena', ctrl.restablecerVista);

module.exports = router;
