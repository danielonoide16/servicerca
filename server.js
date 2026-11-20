require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cargarUsuario = require('./middleware/cargarUsuario');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const log = require('./utils/log');

process.on('uncaughtException', (err) => {
  log.error('Excepción no capturada:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  log.error('Promesa rechazada sin manejar:', err);
  process.exit(1);
});

if (!process.env.SESSION_SECRET) {
  log.error('Falta SESSION_SECRET. Copia .env.example como .env y define un valor propio.');
  process.exit(1);
}
if (process.env.SESSION_SECRET === 'cambia-esto') {
  log.aviso('SESSION_SECRET sigue con el valor de ejemplo. Cámbialo en tu .env.');
}

try {
  const db = require('./db/db'); // abre SQLite y aplica las migraciones pendientes
  log.info('Base de datos lista: ' + db.rutaArchivo);
} catch (err) {
  log.error('No se pudo preparar la base de datos: ' + err.message);
  process.exit(1);
}

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 60 * 1000, // expira tras 30 min de inactividad
  },
}));

// req.user y res.locals.usuario salen de la base de datos en cada petición
app.use(cargarUsuario);

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/cuenta'));
app.use('/perfil', require('./routes/perfil'));
app.use('/solicitudes', require('./routes/solicitudes'));
app.use('/propuestas', require('./routes/propuestas'));
app.use('/resenas', require('./routes/resenas'));

// Siempre al final
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log.info('ServiCerca corriendo en http://localhost:' + PORT));
