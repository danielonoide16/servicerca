// plantilla que comparten todos los correos de servicerca (verificación, restablecer y avisos de propuestas)

const urlApp = () => process.env.APP_URL || 'http://localhost:3000';

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Todos los correos usan la misma plantilla.
// contenido = { nombre, parrafos: [texto, ...], enlace, textoBoton, nota }
function armarHtml({ nombre, parrafos, enlace, textoBoton, nota }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ServiCerca</title>
</head>
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#1d2733;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d5dce4;border-radius:6px;">
    <div style="background:#1f5f8b;color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold;">ServiCerca</div>
    <div style="padding:24px;line-height:1.5;">
      <p>Hola, ${escapar(nombre)}:</p>
      ${parrafos.map((p) => `<p>${escapar(p)}</p>`).join('\n      ')}
      <p style="margin:24px 0;"><a href="${escapar(enlace)}" style="display:inline-block;background:#1f5f8b;color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;">${escapar(textoBoton)}</a></p>
      <p style="font-size:13px;color:#5d6b7a;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="font-size:13px;color:#5d6b7a;word-break:break-all;">${escapar(enlace)}</p>
      <p style="font-size:13px;color:#5d6b7a;">${escapar(nota)}</p>
    </div>
  </div>
</body>
</html>`;
}

function armarTexto({ nombre, parrafos, enlace, textoBoton, nota }) {
  return `Hola, ${nombre}:\n\n${parrafos.join('\n\n')}\n\n${textoBoton}: ${enlace}\n\n${nota}\n\n— El equipo de ServiCerca`;
}

module.exports = { armarHtml, armarTexto, urlApp };
