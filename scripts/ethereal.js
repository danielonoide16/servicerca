// Crea una cuenta de prueba en Ethereal (https://ethereal.email) y muestra las variables para el .env.
// Ethereal es un buzón falso: no entrega correos reales, solo los guarda para verlos en su página.
// Uso: npm run mail:ethereal
const nodemailer = require('nodemailer');

nodemailer.createTestAccount().then((cuenta) => {
  console.log('Cuenta de prueba creada. Copia estas líneas en tu .env:\n');
  console.log(`SMTP_HOST=${cuenta.smtp.host}`);
  console.log(`SMTP_PORT=${cuenta.smtp.port}`);
  console.log(`SMTP_SECURE=${cuenta.smtp.secure}`);
  console.log(`SMTP_USER=${cuenta.user}`);
  console.log(`SMTP_PASS=${cuenta.pass}`);
  console.log(`MAIL_FROM=ServiCerca <${cuenta.user}>`);
  console.log('\nPara ver los correos: entra a https://ethereal.email/login con ese usuario y contraseña,');
  console.log('y abre la sección "Messages".');
}).catch((err) => {
  console.error(`No se pudo crear la cuenta de Ethereal: ${err.message}`);
  console.error('Puedes crearla a mano en https://ethereal.email/create');
  process.exit(1);
});
