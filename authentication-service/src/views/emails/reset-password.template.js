module.exports = function resetPasswordTemplate({ username, resetUrl }) {
  return `
    <h2>Solicitud de Restablecimiento de Contraseña</h2>
    <p>Hola ${username},</p>
    <p>Solicitaste restablecer tu contraseña. Haz clic en el enlace a continuación para restablecerla:</p>
    <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Restablecer Contraseña
    </a>
    <p>Si no puedes hacer clic en el enlace, copia y pega esta URL en tu navegador:</p>
    <p>${resetUrl}</p>
    <p>Este enlace expirará en 1 hora.</p>
    <p>Si no solicitaste esto, por favor ignora este correo y tu contraseña permanecerá sin cambios.</p>
  `;
};
