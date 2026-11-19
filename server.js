require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
require('./db/db');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

app.use('/', require('./routes/auth'));
app.use('/perfil', require('./routes/perfil'));
app.use('/solicitudes', require('./routes/solicitudes'));
app.use('/propuestas', require('./routes/propuestas'));
app.use('/resenas', require('./routes/resenas'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ServiCerca corriendo en http://localhost:${PORT}`));
