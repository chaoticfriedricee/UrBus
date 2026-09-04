module.exports = function welcomeTemplate({ username }) {
  return `
    <h2>¡Bienvenido a UrBus, ${username}!</h2>
    <p>Tu cuenta ha sido verificada y activada exitosamente.</p>
    <p>Ahora puedes disfrutar de todas las funciones de nuestra plataforma.</p>
    <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>
    <p>¡Gracias por unirte a nosotros!</p>
  `;
};
