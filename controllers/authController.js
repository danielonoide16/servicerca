const bcrypt = require('bcryptjs');
const usuarios = require('../db/usuarioModel');
const log = require('../utils/log');

// Se compara contra este hash cuando el correo no existe, para que ambos casos tarden parecido
const HASH_FALSO = bcrypt.hashSync('contrasena-de-relleno', 10);

const inicio = (req, res) => res.render('index', { titulo: 'Inicio' });
const privacidad = (req, res) => res.render('privacidad', { titulo: 'Aviso de privacidad' });

const verLogin = (req, res) =>
  res.render('auth/login', {
    titulo: 'Iniciar sesión',
    errores: [],
    valores: {},
    registrado: req.query.registrado === '1',
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

  const fila = usuarios.buscarParaLogin(correo);
  const coincide = await bcrypt.compare(contrasena, fila ? fila.contrasenaHash : HASH_FALSO);
  if (!fila || !coincide) {
    log.aviso('Intento de inicio de sesión fallido desde ' + req.ip);
    return res.status(401).render('auth/login', {
      titulo: 'Iniciar sesión',
      errores: ['Correo o contraseña incorrectos'],
      valores: { correo },
    });
  }

  await iniciarSesion(req, fila.id);
  log.info('Inicio de sesión correcto, usuario ' + fila.id);
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

  if (usuarios.existeCorreo(correo)) {
    return res.status(409).render('auth/registro', {
      titulo: 'Registrarse', errores: ['Ya existe una cuenta con ese correo'], valores: { nombre, correo, rol },
    });
  }

  const hash = await bcrypt.hash(contrasena, 10);
  const usuario = usuarios.crear({ nombre, correo, contrasenaHash: hash, rol });
  log.info('Usuario registrado: ' + usuario.id + ' (' + usuario.rol + ')');

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
