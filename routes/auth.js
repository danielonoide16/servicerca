const express = require('express');
const { requireAuth, soloInvitados } = require('../middleware/requireAuth');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.get('/', ctrl.inicio);
router.get('/privacidad', ctrl.privacidad);

router.get('/login', soloInvitados, ctrl.verLogin);
router.post('/login', soloInvitados, ctrl.loginVista);

router.get('/registro', soloInvitados, ctrl.verRegistro);
router.post('/registro', soloInvitados, ctrl.registroVista);

router.post('/logout', requireAuth, ctrl.logoutVista);

module.exports = router;
