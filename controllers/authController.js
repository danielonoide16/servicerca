const crypto = require('crypto');
const Usuario = require('../clases/Usuario');
const tokens = require('../db/tokenModel');
const { enviarCorreo } = require('../utils/correo');
const log = require('../utils/log');

const inicio = (req, res) => res.render('index', { titulo: 'Inicio' });
const privacidad = (req, res) => res.render('privacidad', { titulo: 'Aviso de privacidad' });

const verLogin = (req, res) =>
  res.render('auth/login', {
    titulo: 'Iniciar sesión',
    errores: [],
    valores: {},
    registrado: req.query.registrado === '1',
    restablecida: req.query.restablecida === '1',
  });

const verRegistro = (req, res) =>
  res.render('auth/registro', { titulo: 'Registrarse', errores: [], valores: {} });

// Regenera la sesión al iniciar sesión para evitar la fijación de sesión
function iniciarSesion(req, usuarioId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.usuarioId = usuarioId;
      req.session.save((errGuardar) => (errGuardar ? reject(errGuardar) : resolve()));
    });
  });
}

async function loginVista(req, res) {
  const body = req.body || {};
  const correo = String(body.correo || '').trim().toLowerCase();
  const contrasena = String(body.contrasena || '');

  if (!correo || !contrasena) {
    return res.status(400).render('auth/login', {
      titulo: 'Iniciar sesión',
      errores: ['El correo y la contraseña son obligatorios'],
      valores: { correo },
    });
  }

  const usuario = await Usuario.buscarPorCredenciales(correo, contrasena);
  if (!usuario) {
    log.aviso('Intento de inicio de sesión fallido desde ' + req.ip);
    return res.status(401).render('auth/login', {
      titulo: 'Iniciar sesión',
      errores: ['Correo o contraseña incorrectos'],
      valores: { correo },
    });
  }

  await iniciarSesion(req, usuario.id);
  log.info('Inicio de sesión correcto, usuario ' + usuario.id);
  res.redirect('/');
}

async function registroVista(req, res) {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  const correo = String(body.correo || '').trim().toLowerCase();
  const contrasena = String(body.contrasena || '');
  const rol = body.rol;

  const errores = [];
  if (nombre.length < 2) errores.push('El nombre debe tener al menos 2 caracteres');
  if (nombre.length > 100) errores.push('El nombre debe tener como máximo 100 caracteres');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.push('Debe ser un correo válido');
  if (contrasena.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  } else if (Buffer.byteLength(contrasena, 'utf8') > 72) {
    errores.push('La contraseña debe tener como máximo 72 caracteres');
  } else if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
    errores.push('La contraseña debe incluir al menos una letra y un número');
  }
  if (rol !== 'cliente' && rol !== 'prestador') errores.push('Debes elegir si eres cliente o prestador');
  if (body.aceptaPrivacidad !== 'on') errores.push('Debes aceptar el aviso de privacidad');

  if (errores.length > 0) {
    return res.status(400).render('auth/registro', {
      titulo: 'Registrarse', errores, valores: { nombre, correo, rol },
    });
  }

  if (Usuario.existeCorreo(correo)) {
    return res.status(409).render('auth/registro', {
      titulo: 'Registrarse', errores: ['Ya existe una cuenta con ese correo'], valores: { nombre, correo, rol },
    });
  }

  const usuario = await Usuario.registrar(nombre, correo, contrasena, rol);
  log.info('Usuario registrado: ' + usuario.id + ' (' + usuario.rol + ')');

  // enlace de verificación del correo
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  tokens.reemplazar(usuario.id, 'verify-email', tokenHash, expira);
  const enlace = (process.env.APP_URL || 'http://localhost:3000') + '/verificar-correo?token=' + token;
  // sin await: si el correo falla, el registro ya quedó hecho
  enviarCorreo(usuario.correo, 'Verifica tu correo en ServiCerca', usuario.nombre, enlace, '24 horas', 'verificacion', 'Verificar mi correo');

  res.redirect('/login?registrado=1');
}

function logoutVista(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

module.exports = { inicio, privacidad, verLogin, verRegistro, loginVista, registroVista, logoutVista };
