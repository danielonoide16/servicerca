// Carga datos de prueba. Uso: npm run seed
// Limpia las tablas, excepto de el catálogo de oficios, y las vuelve a llenar,
// así que se puede ejecutar las veces que sea sin errores ni duplicados.
const bcrypt = require('bcryptjs');
const db = require('./db');

const PASSWORD = 'Password123'; // misma contraseña para todos los usuarios de prueba
const hash = bcrypt.hashSync(PASSWORD, 10);

const pad = (n) => String(n).padStart(2, '0');
const fecha = (dia, hora = 10) => `2026-10-${pad(dia)} ${pad(hora)}:00:00`;

// ---------- Datos ----------
const clientes = [
  { nombre: 'Laura Gómez', correo: 'laura.gomez@servicerca.test' },
  { nombre: 'Carlos Pérez', correo: 'carlos.perez@servicerca.test' },
  { nombre: 'Sofía Ruiz', correo: 'sofia.ruiz@servicerca.test' },
  { nombre: 'Miguel Ángel Cruz', correo: 'miguel.cruz@servicerca.test' },
  { nombre: 'Elena Vargas', correo: 'elena.vargas@servicerca.test' },
];

const prestadores = [
  { nombre: 'Roberto Mendoza', correo: 'roberto.mendoza@servicerca.test', zona: 'Centro',
    descripcion: 'Plomero y albañil con 15 años de experiencia en reparaciones del hogar.',
    oficios: ['Plomería', 'Albañilería'] },
  { nombre: 'Luis Hernández', correo: 'luis.hernandez@servicerca.test', zona: 'Norte',
    descripcion: 'Electricista residencial: instalaciones, apagadores y centros de carga.',
    oficios: ['Electricidad'] },
  { nombre: 'Marta Salazar', correo: 'marta.salazar@servicerca.test', zona: 'Centro',
    descripcion: 'Carpintería a la medida, muebles de cocina y closets. También pintura.',
    oficios: ['Carpintería', 'Pintura'] },
  { nombre: 'Jorge Ramírez', correo: 'jorge.ramirez@servicerca.test', zona: 'Sur',
    descripcion: 'Mantenimiento de jardines, poda y riego automático.',
    oficios: ['Jardinería'] },
  { nombre: 'Ana Torres', correo: 'ana.torres@servicerca.test', zona: 'Centro',
    descripcion: 'Pintura interior y exterior, impermeabilización y acabados en yeso.',
    oficios: ['Pintura', 'Albañilería'] },
];

// cliente y prestadores
// props: [prestador, estado, precio, disponibilidad, mensaje]
// resena: [calificacion, comentario], solo si fue completada
const solicitudes = [
  { cliente: 0, oficio: 'Plomería', zona: 'Centro', estado: 'Publicada',
    descripcion: 'Fuga de agua debajo del lavabo de la cocina.',
    props: [[0, 'Enviada', 450, 'Mañana por la tarde', 'Puedo pasar a revisar sin costo de visita.']] },
  { cliente: 1, oficio: 'Electricidad', zona: 'Norte', estado: 'Publicada',
    descripcion: 'Cambiar el centro de carga y revisar el cableado de dos recámaras.',
    props: [[1, 'Enviada', 1800, 'Esta semana', 'Incluye material básico.']] },
  { cliente: 2, oficio: 'Pintura', zona: 'Centro', estado: 'Publicada',
    descripcion: 'Pintar sala y comedor (aprox. 45 m2) en color blanco.',
    props: [
      [2, 'Enviada', 3200, 'Próxima semana', 'Dos manos de pintura vinílica.'],
      [4, 'Enviada', 2900, 'En 3 días', 'Incluye resanes menores.'],
    ] },
  { cliente: 3, oficio: 'Albañilería', zona: 'Centro', estado: 'Asignada',
    descripcion: 'Construir una barda de 6 metros en el patio trasero.',
    props: [
      [0, 'Aceptada', 7500, 'Inicio el lunes', 'Material y mano de obra incluidos.'],
      [4, 'Rechazada', 8200, 'En dos semanas', 'Puedo iniciar hasta el día 20.'],
    ] },
  { cliente: 4, oficio: 'Jardinería', zona: 'Sur', estado: 'Asignada',
    descripcion: 'Poda de árboles y mantenimiento general del jardín.',
    props: [[3, 'Aceptada', 1200, 'Sábado por la mañana', 'Me llevo los residuos.']] },
  { cliente: 0, oficio: 'Carpintería', zona: 'Centro', estado: 'Completada',
    descripcion: 'Fabricar un closet empotrado para la recámara principal.',
    props: [[2, 'Aceptada', 9800, 'Entrega en 10 días', 'Madera de pino con acabado barnizado.']],
    resena: [5, 'Quedó exactamente como lo pedí, muy puntual.'] },
  { cliente: 1, oficio: 'Plomería', zona: 'Centro', estado: 'Completada',
    descripcion: 'Reparar la regadera y cambiar la llave del baño.',
    props: [[0, 'Aceptada', 850, 'Mañana', 'Llevo las refacciones.']],
    resena: [4, 'Buen trabajo, solo tardó un poco más de lo acordado.'] },
  { cliente: 2, oficio: 'Electricidad', zona: 'Norte', estado: 'Completada',
    descripcion: 'Instalar tres contactos nuevos y dos lámparas de techo.',
    props: [[1, 'Aceptada', 1100, 'Jueves', 'Trabajo garantizado por 3 meses.']],
    resena: [5, 'Muy profesional y limpio al trabajar.'] },
  { cliente: 3, oficio: 'Pintura', zona: 'Centro', estado: 'Completada',
    descripcion: 'Pintar la fachada de la casa y la reja.',
    props: [
      [4, 'Aceptada', 4500, 'Fin de semana', 'Incluye pintura y andamio.'],
      [2, 'Rechazada', 5200, 'Próxima semana', 'Puedo hacerlo con acabado texturizado.'],
    ],
    resena: [3, 'El resultado fue bueno, pero dejó algo de desorden.'] },
  { cliente: 4, oficio: 'Jardinería', zona: 'Sur', estado: 'Completada',
    descripcion: 'Instalar sistema de riego automático en el jardín delantero.',
    props: [[3, 'Aceptada', 2600, 'En 5 días', 'Incluye programador y garantía.']],
    resena: [5, 'Excelente servicio, lo recomiendo.'] },
  { cliente: 0, oficio: 'Albañilería', zona: 'Centro', estado: 'Completada',
    descripcion: 'Reparar grietas en el muro de la cochera y resanar.',
    props: [[0, 'Aceptada', 2300, 'El martes', 'Dos días de trabajo.']] }, // sin reseña
  { cliente: 1, oficio: 'Carpintería', zona: 'Centro', estado: 'Cancelada',
    descripcion: 'Reparar la puerta principal de madera.',
    props: [[2, 'Rechazada', 1500, 'Esta semana', 'Puedo pasar a verla mañana.']] },
  { cliente: 4, oficio: 'Electricidad', zona: 'Norte', estado: 'Cancelada',
    descripcion: 'Instalar un timbre con cámara.',
    props: [[1, 'Rechazada', 950, 'Viernes', 'Incluye instalación y configuración.']] },
];

// Usuarios extra para probar permisos: un admin y dos cuentas sin verificar (cliente y prestador)
const admin = { nombre: 'Administrador ServiCerca', correo: 'admin@servicerca.test' };
const sinVerificar = [
  { nombre: 'Valeria Núñez', correo: 'valeria.nunez@servicerca.test', rol: 'cliente' },
  { nombre: 'Héctor Lara', correo: 'hector.lara@servicerca.test', rol: 'prestador' },
];

// Una notificación falla a propósito para poder probar ese caso
const NOTIFICACION_FALLIDA = 3;

// ---------- Carga ----------
const tablas = ['notificaciones', 'resenas', 'propuestas', 'perfil_oficios',
  'solicitudes', 'tokens_un_solo_uso', 'perfiles_prestador', 'usuarios'];

const cargar = db.transaction(() => {
  for (const t of tablas) db.exec(`DELETE FROM ${t}`);
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN (${tablas.map((t) => `'${t}'`).join(',')})`);

  const oficioId = {};
  for (const o of db.prepare('SELECT id, nombre FROM oficios').all()) oficioId[o.nombre] = o.id;

  const insUsuario = db.prepare(
    'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, email_verificado) VALUES (?, ?, ?, ?, ?)');
  const clienteId = clientes.map((c) =>
    Number(insUsuario.run(c.nombre, c.correo, hash, 'cliente', 1).lastInsertRowid));
  const prestadorId = prestadores.map((p) =>
    Number(insUsuario.run(p.nombre, p.correo, hash, 'prestador', 1).lastInsertRowid));
  insUsuario.run(admin.nombre, admin.correo, hash, 'admin', 1);
  for (const u of sinVerificar) insUsuario.run(u.nombre, u.correo, hash, u.rol, 0);

  const insPerfil = db.prepare(
    'INSERT INTO perfiles_prestador (usuario_id, descripcion, zona_servicio) VALUES (?, ?, ?)');
  const insPerfilOficio = db.prepare(
    'INSERT INTO perfil_oficios (usuario_id, oficio_id) VALUES (?, ?)');
  prestadores.forEach((p, i) => {
    insPerfil.run(prestadorId[i], p.descripcion, p.zona);
    for (const o of p.oficios) insPerfilOficio.run(prestadorId[i], oficioId[o]);
  });

  const insSolicitud = db.prepare(
    `INSERT INTO solicitudes (cliente_id, oficio_id, descripcion, zona, fecha_publicacion, estado)
     VALUES (?, ?, ?, ?, ?, ?)`);
  const insPropuesta = db.prepare(
    `INSERT INTO propuestas (solicitud_id, prestador_id, precio, disponibilidad, mensaje, fecha_envio, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insResena = db.prepare(
    'INSERT INTO resenas (solicitud_id, calificacion, comentario, fecha) VALUES (?, ?, ?, ?)');
  const insNotif = db.prepare(
    `INSERT INTO notificaciones (propuesta_id, destinatario, asunto, estado_envio, fecha_envio)
     VALUES (?, ?, ?, ?, ?)`);

  let nNotif = 0;
  const notificar = (propuesta, destinatario, asunto, fechaEnvio) => {
    nNotif += 1;
    const estado = nNotif === NOTIFICACION_FALLIDA ? 'Fallido' : 'Enviado';
    insNotif.run(propuesta, destinatario, asunto, estado, fechaEnvio);
  };

  solicitudes.forEach((s, i) => {
    const dia = i + 1;
    const sid = Number(insSolicitud.run(
      clienteId[s.cliente], oficioId[s.oficio], s.descripcion, s.zona, fecha(dia), s.estado
    ).lastInsertRowid);

    for (const [pi, estado, precio, disp, msg] of s.props) {
      const envio = fecha(dia, 14);
      const pid = Number(insPropuesta.run(
        sid, prestadorId[pi], precio, disp, msg, envio, estado).lastInsertRowid);
      notificar(pid, clientes[s.cliente].correo, 'Recibiste una nueva propuesta', envio);
      if (estado === 'Aceptada') {
        notificar(pid, prestadores[pi].correo, 'Tu propuesta fue aceptada', fecha(dia, 18));
      }
    }

    if (s.resena) insResena.run(sid, s.resena[0], s.resena[1], `2026-11-${pad(dia)} 12:00:00`);
  });
});

cargar();

const conteo = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log('Seed completado:');
for (const t of ['usuarios', 'perfiles_prestador', 'perfil_oficios', 'solicitudes',
  'propuestas', 'resenas', 'notificaciones']) {
  console.log(`  ${t}: ${conteo(t)}`);
}
console.log(`Contraseña de todos los usuarios de prueba: ${PASSWORD}`);
db.close();
