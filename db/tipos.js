// Constantes del dominio: roles, estados y propósitos de los tokens.
const ROLES = { CLIENTE: 'cliente', PRESTADOR: 'prestador', ADMIN: 'admin' };

const ESTADOS_SOLICITUD = {
  PUBLICADA: 'Publicada',
  ASIGNADA: 'Asignada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

const ESTADOS_PROPUESTA = { ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada' };

const PROPOSITOS_TOKEN = { VERIFICAR_CORREO: 'verify-email', RESTABLECER_CONTRASENA: 'reset-password' };

module.exports = { ROLES, ESTADOS_SOLICITUD, ESTADOS_PROPUESTA, PROPOSITOS_TOKEN };
