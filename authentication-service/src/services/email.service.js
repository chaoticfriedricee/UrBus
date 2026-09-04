const nodemailer = require('nodemailer');
const env = require('../../configs/env.config');
const logger = require('../../configs/logger.configuration');
const verifyEmailTemplate = require('../views/emails/verify-email.template');
const resetPasswordTemplate = require('../views/emails/reset-password.template');
const welcomeTemplate = require('../views/emails/welcome.template');

async function sendEmailVerificationAsync(email, username, token) {
  const subject = 'Verifica tu dirección de correo electrónico';
  const verificationUrl = `${env.app.frontendUrl}/verify-email?token=${token}`;
  const body = verifyEmailTemplate({ username, verificationUrl });
  await sendEmailAsync(email, subject, body);
}

async function sendPasswordResetAsync(email, username, token) {
  const subject = 'Restablece tu contraseña';
  const resetUrl = `${env.app.frontendUrl}/reset-password?token=${token}`;
  const body = resetPasswordTemplate({ username, resetUrl });
  await sendEmailAsync(email, subject, body);
}

async function sendWelcomeEmailAsync(email, username) {
  const subject = '¡Bienvenido a UrBus!';
  const body = welcomeTemplate({ username });
  await sendEmailAsync(email, subject, body);
}

/**
 * Envía un correo. Intenta primero Brevo (API HTTPS, funciona en hosts como Render
 * que bloquean SMTP saliente, y no requiere dominio verificado, solo un remitente).
 * Si Brevo no está habilitado/configurado, o si falla, cae al envío por SMTP vía
 * nodemailer (comportamiento original).
 */
async function sendEmailAsync(to, subject, html) {
  if (env.brevo.enabled && env.brevo.apiKey) {
    try {
      await sendViaBrevoAsync(to, subject, html);
      logger.info('Email enviado exitosamente vía Brevo');
      return;
    } catch (err) {
      logger.error(`Error al enviar el email vía Brevo, intentando SMTP como respaldo: ${err.message}`);
      // No hacemos return/throw aquí: seguimos abajo al envío por SMTP.
    }
  }

  await sendViaSmtpAsync(to, subject, html);
}

/**
 * Envío vía la API HTTP de Brevo (https://developers.brevo.com/reference/sendtransacemail).
 * No usa el SDK oficial para no agregar una dependencia nueva: Node >=18 ya trae fetch global.
 * A diferencia de Resend, Brevo solo pide verificar un correo remitente (no un dominio),
 * así que puede mandar a cualquier destinatario desde el plan gratuito.
 */
async function sendViaBrevoAsync(to, subject, html) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.brevo.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.brevo.fromName, email: env.brevo.fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Brevo respondió ${response.status}: ${errorBody}`);
  }
}

/**
 * Envío vía SMTP. Equivalente a AuthService.Application.Services.EmailService.SendEmailAsync (.NET/MailKit),
 * usando nodemailer. Respeta las mismas banderas de configuración: Enabled, Timeout,
 * IgnoreCertificateErrors, UseImplicitSsl (puerto 465 vs 587/STARTTLS) y UseFallback.
 */
async function sendViaSmtpAsync(to, subject, html) {
  if (!env.smtp.enabled) {
    logger.info('El envío de emails está deshabilitado en la configuración. Omitiendo envío');
    return;
  }

  if (!env.smtp.host || !env.smtp.user || !env.smtp.password) {
    logger.error('La configuración SMTP no está configurada correctamente');
    throw new Error('La configuración SMTP no está configurada correctamente');
  }

  const secure = env.smtp.useImplicitSsl || env.smtp.port === 465;

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure, // true -> SSL directo (465), false -> STARTTLS (587) manejado automáticamente por nodemailer
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
    connectionTimeout: env.smtp.timeoutMs,
    greetingTimeout: env.smtp.timeoutMs,
    socketTimeout: env.smtp.timeoutMs,
    tls: env.smtp.ignoreCertificateErrors ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to,
      subject,
      html,
    });
    logger.info('Email enviado exitosamente vía SMTP');
  } catch (err) {
    logger.error(`Error al enviar el email vía SMTP: ${err.message}`);

    if (env.smtp.useFallback) {
      logger.warn('Usando respaldo de email');
      return; // No fallar, solo logear (igual que UseFallback en .NET)
    }

    throw new Error(`Error al enviar el email: ${err.message}`);
  }
}

module.exports = {
  sendEmailVerificationAsync,
  sendPasswordResetAsync,
  sendWelcomeEmailAsync,
};