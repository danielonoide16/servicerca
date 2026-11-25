const crypto = require('crypto');
const db = require('../db/db');
const log = require('../utils/log');
const Usuario = require('../clases/Usuario');
const Contrasena = require('../clases/Contrasena');
const tokens = require('../db/tokenModel');
const { enviarCorreo } = require('../utils/correo');

// El enlace del correo abre una página con un botón (GET) y el cambio se hace con POST:
// así los antivirus o previsualizadores de enlaces no gastan el token sin querer.
function verVerificar(req, res) {
  res.set('Referrer-Policy', 'no-referrer');
  const token = String(req.query.token || '');
  if (/^[a-f0-9]{64}$/.test(token)) {
    res.render('auth/verificar-correo', { titulo: 'Verificar correo', estado: 'confirmar', token, errores: [] });
  } else {
    res.render('auth/verificar-correo', {
      titulo: 'Verificar correo', estado: 'error', token: '',
      errores: ['El enlace no es válido, ya expiró o ya fue utilizado'],
    });
  }
}

function verificarVista(req, res) {
  res.set('Referrer-Policy', 'no-referrer');
  const token = String((req.body || {}).token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).render('auth/verificar-correo', {
      titulo: 'Verificar correo', estado: 'error', token: '',
      errores: ['El enlace no es válido, ya expiró o ya fue utilizado'],
    });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const usuarioId = db.transaction(() => {
    const id = tokens.marcarUsado(tokenHash, 'verify-email', new Date().toISOString());
    if (id) Usuario.buscarPorId(id).marcarCorreoVerificado();
    return id;
  })();

  if (!usuarioId) {
    return res.status(400).render('auth/verificar-correo', {
      titulo: 'Verificar correo', estado: 'error', token: '',
      errores: ['El enlace no es válido, ya expiró o ya fue utilizado'],
    });
  }
  log.info('Correo verificado, usuario ' + usuarioId);
  res.render('auth/verificar-correo', { titulo: 'Correo verificado', estado: 'ok', token: '', errores: [] });
}

function reenviarVista(req, res) {
  const usuario = req.user;
  if (usuario.emailVerificado) {
    return res.render('mensaje', { titulo: 'Verificación de correo', texto: 'Tu correo ya está verificado.' });
  }

  // enlace nuevo de verificación
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  tokens.reemplazar(usuario.id, 'verify-email', tokenHash, expira);
  const enlace = (process.env.APP_URL || 'http://localhost:3000') + '/verificar-correo?token=' + token;
  enviarCorreo(usuario.correo, 'Verifica tu correo en ServiCerca', usuario.nombre, enlace, '24 horas', 'verificacion', 'Verificar mi correo');

  res.render('mensaje', {
    titulo: 'Verificación de correo',
    texto: 'Te enviamos un nuevo enlace de verificación. Revisa tu correo.',
  });
}

const verOlvide = (req, res) =>
  res.render('auth/olvide-contrasena', { titulo: 'Olvidé mi contraseña', errores: [], valores: {} });

function olvideVista(req, res) {
  const correo = String((req.body || {}).correo || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return res.status(400).render('auth/olvide-contrasena', {
      titulo: 'Olvidé mi contraseña', errores: ['Debe ser un correo válido'], valores: { correo },
    });
  }

  const r = Usuario.buscarPorCorreo(correo);
  if (r) {
    const t = crypto.randomBytes(32).toString('hex');
    const h = crypto.createHash('sha256').update(t).digest('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    tokens.reemplazar(r.id, 'reset-password', h, expira);
    const enlace = (process.env.APP_URL || 'http://localhost:3000') + '/restablecer-contrasena?token=' + t;
    enviarCorreo(r.correo, 'Restablece tu contraseña de ServiCerca', r.nombre, enlace, '1 hora', 'restablecer', 'Elegir una contraseña nueva');
  }

  // La respuesta es la misma exista o no la cuenta, para no revelar qué correos están registrados
  res.render('mensaje', {
    titulo: 'Revisa tu correo',
    texto: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  });
}

function verRestablecer(req, res) {
  res.set('Referrer-Policy', 'no-referrer');
  const token = String(req.query.token || '');
  if (/^[a-f0-9]{64}$/.test(token)) {
    res.render('auth/restablecer-contrasena', { titulo: 'Restablecer contraseña', estado: 'formulario', token, errores: [] });
  } else {
    res.render('auth/restablecer-contrasena', {
      titulo: 'Restablecer contraseña', estado: 'error', token: '',
      errores: ['El enlace no es válido, ya expiró o ya fue utilizado'],
    });
  }
}

async function restablecerVista(req, res) {
  res.set('Referrer-Policy', 'no-referrer');
  const body = req.body || {};
  const token = String(body.token || '');
  const contrasena = String(body.contrasena || '');
  const confirmacion = String(body.confirmacion || '');

  if (/^[a-f0-9]{64}$/.test(token)) {
    const errores = [];
    if (contrasena.length < 8) {
      errores.push('La contraseña debe tener al menos 8 caracteres');
    } else if (Buffer.byteLength(contrasena, 'utf8') > 72) {
      errores.push('La contraseña debe tener como máximo 72 caracteres');
    } else if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
      errores.push('La contraseña debe incluir al menos una letra y un número');
    }
    if (contrasena !== confirmacion) errores.push('Las contraseñas no coinciden');

    if (errores.length === 0) {
      const hash = await Contrasena.cifrar(contrasena);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const usuarioId = db.transaction(() => {
        const id = tokens.marcarUsado(tokenHash, 'reset-password', new Date().toISOString());
        if (id) Usuario.buscarPorId(id).actualizarContrasena(hash);
        return id;
      })();

      if (usuarioId) {
        log.info('Contraseña restablecida, usuario ' + usuarioId);
        return res.redirect('/login?restablecida=1');
      } else {
        return res.status(400).render('auth/restablecer-contrasena', {
          titulo: 'Restablecer contraseña', estado: 'error', token: '',
          errores: ['El enlace no es válido, ya expiró o ya fue utilizado'],
        });
      }
    } else {
      return res.status(400).render('auth/restablecer-contrasena', {
        titulo: 'Restablecer contraseña', estado: 'formulario', token, errores,
      });
    }
  } else {
    return res.status(400).render('auth/restablecer-contrasena', {
      titulo: 'Restablecer contraseña', estado: 'error', token: '',
      errores: ['El enlace no es válido, ya expiró o ya fue utilizado'],
    });
  }
}

module.exports = { verVerificar, verificarVista, reenviarVista, verOlvide, olvideVista, verRestablecer, restablecerVista };
