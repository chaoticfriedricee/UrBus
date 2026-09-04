module.exports = function verifyEmailTemplate({ username, verificationUrl }) {
  return `
    <h2>¡Bienvenido ${username}!</h2>
    <p>Por favor, verifica tu dirección de correo electrónico haciendo clic en el enlace a continuación:</p>
    <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Verificar Correo Electrónico
    </a>
    <p>Si no puedes hacer clic en el enlace, copia y pega esta URL en tu navegador:</p>
    <p>${verificationUrl}</p>
    <p>Este enlace expirará en 24 horas.</p>
    <p>Si no creaste una cuenta, por favor ignora este correo.</p>
    <p>&nbsp;</p>
    <p>UrBus Company</p>
  `;
};
