// Exige sesión iniciada. Si no hay, manda al login.
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

// Exige uno de los roles indicados: requireRole('admin') o requireRole('cliente', 'prestador')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/login');
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).render('error', { status: 403, message: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
}

// Exige el correo verificado (para publicar solicitudes y enviar propuestas)
function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (!req.user.emailVerificado) {
    return res.status(403).render('error', { status: 403, message: 'Verifica tu correo para realizar esta acción' });
  }
  next();
}

// Para /login y /registro: si ya hay sesión, no tiene sentido mostrarlos
function soloInvitados(req, res, next) {
  if (req.user) return res.redirect('/');
  next();
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
module.exports.requireVerifiedEmail = requireVerifiedEmail;
module.exports.soloInvitados = soloInvitados;
