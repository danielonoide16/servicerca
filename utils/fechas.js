// SQLite guarda las fechas en UTC ("2026-11-25 02:30:00"). Aquí se pasan a la zona horaria del
// proyecto (variable ZONA_HORARIA, por defecto America/Mexico_City) para mostrar el día correcto.
const ZONA = process.env.ZONA_HORARIA || 'America/Mexico_City';

// Devuelve "AAAA-MM-DD" en la zona horaria del proyecto
function fechaCorta(textoUtc) {
  const fecha = new Date(String(textoUtc).replace(' ', 'T') + 'Z');
  if (Number.isNaN(fecha.getTime())) return String(textoUtc).slice(0, 10);
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA });
}

module.exports = { fechaCorta };
