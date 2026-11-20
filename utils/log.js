// Mensajes de consola del servidor. Todos los archivos usan estas funciones en lugar de console.*
const info = (mensaje) => console.log(mensaje);
const aviso = (mensaje) => console.warn(mensaje);
const error = (mensaje, err) => (err ? console.error(mensaje, err) : console.error(mensaje));

module.exports = { info, aviso, error };
