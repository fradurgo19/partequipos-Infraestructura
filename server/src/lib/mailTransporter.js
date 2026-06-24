import nodemailer from 'nodemailer';

const EMAIL_SEND_TIMEOUT_MS = 8000;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'fradurgo19@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || 'ehfmrpxlugpsqhzd',
  },
});

export const MAIL_FROM_ADDRESS = process.env.EMAIL_FROM || 'fradurgo19@gmail.com';
export const MAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Sistema de Gestión de Facturas';

export const formatMailFrom = () => `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`;

export const sendMailWithTimeout = (options, timeoutMs = EMAIL_SEND_TIMEOUT_MS) =>
  Promise.race([
    transporter.sendMail(options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout')), timeoutMs)
    ),
  ]);

export default transporter;
