const Usuario = require('./Usuario');
const Notificacion = require('./Notificacion');
const { urlApp } = require('../utils/plantillaCorreo');

// avisos por correo de rf-13: cuando llega una propuesta y cuando se acepta.
// busca al destinatario, arma el contenido, lo manda con el servicio de correo y registra la notificación
class AvisosPropuesta {
  // servicioCorreo es cualquier implementación de ServicioCorreo
  constructor(servicioCorreo) {
    this.servicioCorreo = servicioCorreo;
  }

  // avisarle al cliente que llegó una propuesta a su solicitud
  async propuestaRecibida(propuesta, solicitud) {
    const cliente = Usuario.buscarPorId(solicitud.clienteId);
    return this.avisar(propuesta.id, cliente, 'Recibiste una propuesta para tu solicitud de ' + solicitud.oficio, {
      parrafos: [
        `Un prestador te mandó una propuesta de $${propuesta.precio} para tu solicitud "${solicitud.descripcion}".`,
        `Disponibilidad: ${propuesta.disponibilidad}.`,
      ],
      enlace: `${urlApp()}/solicitudes/${solicitud.id}`,
      textoBoton: 'Ver la propuesta',
      nota: 'Entra a ServiCerca para verla y aceptarla.',
    }, 'propuesta-recibida');
  }

  // avisarle al prestador que el cliente aceptó su propuesta
  async propuestaAceptada(propuesta) {
    const prestador = Usuario.buscarPorId(propuesta.prestadorId);
    return this.avisar(propuesta.id, prestador, 'Aceptaron tu propuesta en ServiCerca', {
      parrafos: [
        `El cliente aceptó tu propuesta de $${propuesta.precio}.`,
        'Ponte de acuerdo con él para hacer el trabajo.',
      ],
      enlace: `${urlApp()}/historial/propuestas/${propuesta.id}`,
      textoBoton: 'Ver mi propuesta',
      nota: 'Puedes ver el detalle en tu historial de ServiCerca.',
    }, 'propuesta-aceptada');
  }

  // manda el correo y registra si salió o no. regresa la notificación registrada
  async avisar(propuestaId, destinatario, asunto, contenido, tipo) {
    const enviado = await this.servicioCorreo.enviar(destinatario.correo, asunto, { nombre: destinatario.nombre, ...contenido }, tipo);
    return Notificacion.registrar(propuestaId, destinatario.correo, asunto, enviado ? 'Enviado' : 'Fallido');
  }
}

module.exports = AvisosPropuesta;
