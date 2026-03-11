import express from 'express';
import nodemailer from 'nodemailer';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configurar transporter de nodemailer con Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fradurgo19@gmail.com',
    pass: 'ehfmrpxlugpsqhzd', // Clave de aplicación
  },
});

// Endpoint para enviar notificaciones por email
router.post('/email', authenticateToken, async (req, res) => {
  try {
    const { to, subject, message, html } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'to, subject, and message are required' });
    }

    const mailOptions = {
      from: 'fradurgo19@gmail.com',
      to,
      subject,
      text: message,
      html: html || message.replaceAll('\n', '<br>'),
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Timeout para envío de un solo email (evitar colgar la función)
const EMAIL_SEND_TIMEOUT_MS = 8000;

function sendMailWithTimeout(options) {
  return Promise.race([
    transporter.sendMail(options),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Email send timeout')), EMAIL_SEND_TIMEOUT_MS)),
  ]);
}

// Endpoint para enviar notificaciones de tareas según presupuesto.
// Responde 202 de inmediato y envía correos en segundo plano para evitar timeout 504.
router.post('/task-budget', authenticateToken, async (req, res) => {
  try {
    const { taskTitle, budget, requesterName } = req.body;

    if (!budget || !taskTitle) {
      return res.status(400).json({ error: 'budget and taskTitle are required' });
    }

    const budgetNum = Number.parseFloat(budget);
    let recipients = [];

    if (budgetNum > 10000000) {
      recipients = [
        { email: 'fbustamante@partequipos.com', name: 'ANDRES FELIPE BUSTAMANTE CESPEDES' },
        { email: 'pedro.cano@partequipos.com', name: 'Pedro Cano' },
      ];
    } else if (budgetNum > 5000000) {
      recipients = [
        { email: 'fbustamante@partequipos.com', name: 'ANDRES FELIPE BUSTAMANTE CESPEDES' },
      ];
    } else if (budgetNum > 0 && budgetNum <= 5000000) {
      recipients = [
        { email: 'infraestructura@partequipos.com', name: 'EDISON VALENCIA' },
      ];
    }

    let subject;
    if (budgetNum > 10000000) {
      subject = `🚨 Tarea de Alto Presupuesto - ${taskTitle}`;
    } else if (budgetNum > 5000000) {
      subject = `⚠️ Tarea Requiere Aprobación - ${taskTitle}`;
    } else {
      subject = `📋 Nueva Tarea - ${taskTitle}`;
    }

    const reqName = requesterName || 'N/A';
    let message;
    if (budgetNum > 10000000) {
      message = `Se ha creado una tarea con presupuesto de $${budgetNum.toLocaleString('es-CO')} que requiere su revisión y aprobación.\n\nTarea: ${taskTitle}\nSolicitante: ${reqName}\n\nPor favor, revise la tarea en el sistema.`;
    } else if (budgetNum > 5000000) {
      message = `Se ha creado una tarea con presupuesto de $${budgetNum.toLocaleString('es-CO')} que requiere su aprobación.\n\nTarea: ${taskTitle}\nSolicitante: ${reqName}\n\nPor favor, revise la tarea en el sistema.`;
    } else {
      message = `Se ha creado una nueva tarea con presupuesto de $${budgetNum.toLocaleString('es-CO')}.\n\nTarea: ${taskTitle}\nSolicitante: ${reqName}\n\nPuede revisar la tarea en el sistema.`;
    }

    // Responder de inmediato para evitar 504; envío en segundo plano
    res.status(202).json({
      success: true,
      message: 'Notificaciones en cola',
    });

    // Enviar correos en segundo plano (sin bloquear la respuesta)
    const baseOptions = {
      from: 'fradurgo19@gmail.com',
      subject,
      text: message,
      html: message.replaceAll('\n', '<br>'),
    };
    setImmediate(() => {
      Promise.all(
        recipients.map((r) =>
          sendMailWithTimeout({ ...baseOptions, to: r.email }).then(
            (info) => ({ recipient: r.email, success: true, messageId: info.messageId }),
            (err) => {
              console.error(`Error sending email to ${r.email}:`, err?.message || err);
              return { recipient: r.email, success: false, error: err?.message || 'Unknown error' };
            }
          )
        )
      ).catch((err) => console.error('Error sending task-budget emails:', err));
    });
  } catch (error) {
    console.error('Error sending task notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications', details: error.message });
  }
});

// Endpoint para enviar notificaciones de aprobación de cortes
router.post('/cut-approval', authenticateToken, async (req, res) => {
  try {
    const { cutId, cutTitle, cutValue, photos, siteName, taskTitle } = req.body;

    if (!cutId || !cutTitle) {
      return res.status(400).json({ error: 'cutId and cutTitle are required' });
    }

    const cutValueNum = Number.parseFloat(String(cutValue || 0));
    
    const edisonEmail = 'infraestructura@partequipos.com';

    // Preparar HTML con fotos
    let photosHTML = '';
    if (photos && photos.length > 0) {
      photosHTML = '<div style="margin-top: 20px;"><h3>Fotografías del Corte:</h3>';
      photos.forEach((photo, index) => {
        photosHTML += `<img src="${photo}" alt="Foto ${index + 1}" style="max-width: 300px; margin: 10px; border: 1px solid #ccc;" />`;
      });
      photosHTML += '</div>';
    }

    // Email a Edison
    try {
      const edisonSubject = `📋 Solicitud de Aprobación de Corte - ${cutTitle}`;
      const edisonMessage = `
        Se ha registrado un nuevo corte que requiere su revisión y firma digital.

        Información del Corte:
        - Título: ${cutTitle}
        - Sede: ${siteName || 'N/A'}
        ${taskTitle ? `- Tarea Asociada: ${taskTitle}` : ''}
        - Valor: $${cutValueNum.toLocaleString('es-CO')}

        Por favor, revise el corte en el sistema y proporcione su firma digital.

        ${photosHTML}
      `;

      await transporter.sendMail({
        from: 'fradurgo19@gmail.com',
        to: edisonEmail,
        subject: edisonSubject,
        text: edisonMessage.replaceAll(/<[^>]*>/g, ''),
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #cf1b22;">Solicitud de Aprobación de Corte</h2>
            <p>Se ha registrado un nuevo corte que requiere su revisión y firma digital.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #cf1b22;">
              <h3>Información del Corte:</h3>
              <ul>
                <li><strong>Título:</strong> ${cutTitle}</li>
                <li><strong>Sede:</strong> ${siteName || 'N/A'}</li>
                ${taskTitle ? `<li><strong>Tarea Asociada:</strong> ${taskTitle}</li>` : ''}
                <li><strong>Valor:</strong> $${cutValueNum.toLocaleString('es-CO')}</li>
              </ul>
            </div>

            <p>Por favor, revise el corte en el sistema y proporcione su firma digital.</p>

            ${photosHTML}

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Este es un correo automático del sistema de gestión de infraestructura.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error(`Error sending email to Edison:`, error);
    }

    res.json({
      success: true,
      message: 'Notification email sent to Edison',
      nextStep: 'Edison debe revisar y firmar digitalmente el corte',
    });
  } catch (error) {
    console.error('Error sending cut approval notification:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

// Endpoint para notificar aprobación de Edison a Felipe (y otros si el valor supera 10M)
router.post('/cut-edison-approved', authenticateToken, async (req, res) => {
  try {
    const { cutId, cutTitle, cutValue, siteName, taskTitle } = req.body;

    if (!cutId || !cutTitle) {
      return res.status(400).json({ error: 'cutId and cutTitle are required' });
    }

    const cutValueNum = Number.parseFloat(String(cutValue || 0));
    const felipe = { email: 'fbustamante@partequipos.com', name: 'ANDRES FELIPE BUSTAMANTE CESPEDES' };
    const recipients = cutValueNum > 10000000
      ? [felipe, { email: 'pedro.cano@partequipos.com', name: 'Pedro Cano' }, { email: 'claudia.cano@partequipos.com', name: 'Claudia Cano' }]
      : [felipe];

    const isHighValue = cutValueNum > 10000000;
    const subject = isHighValue
      ? `🚨 Corte de Alto Valor Aprobado por Edison - ${cutTitle}`
      : `✅ Corte Aprobado por Edison - ${cutTitle}`;
    const taskLine = taskTitle ? `Tarea Asociada: ${taskTitle}` : '';
    const message = isHighValue
      ? `Edison ha aprobado y firmado un corte con valor de $${cutValueNum.toLocaleString('es-CO')} que requiere su revisión final.\n\nCorte: ${cutTitle}\nSede: ${siteName || 'N/A'}\n${taskLine}\n\nPor favor, revise y apruebe el corte en el sistema.`
      : `Edison ha aprobado y firmado un corte que requiere su revisión.\n\nCorte: ${cutTitle}\nSede: ${siteName || 'N/A'}\n${taskLine}\nValor: $${cutValueNum.toLocaleString('es-CO')}\n\nPor favor, revise y apruebe el corte en el sistema.`;
    const headingHtml = isHighValue ? '🚨 Corte de Alto Valor' : '✅ Corte Aprobado';
    const taskLi = taskTitle ? `<li><strong>Tarea Asociada:</strong> ${taskTitle}</li>` : '';

    const results = [];
    for (const recipient of recipients) {
      try {
        const info = await transporter.sendMail({
          from: 'fradurgo19@gmail.com',
          to: recipient.email,
          subject,
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #cf1b22;">${headingHtml}</h2>
              <p>Edison ha aprobado y firmado un corte que requiere su revisión.</p>
              <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #cf1b22;">
                <h3>Información del Corte:</h3>
                <ul>
                  <li><strong>Corte:</strong> ${cutTitle}</li>
                  <li><strong>Sede:</strong> ${siteName || 'N/A'}</li>
                  ${taskLi}
                  <li><strong>Valor:</strong> $${cutValueNum.toLocaleString('es-CO')}</li>
                </ul>
              </div>
              <p>Por favor, revise y apruebe el corte en el sistema.</p>
              <p style="margin-top: 30px; color: #666; font-size: 12px;">Este es un correo automático del sistema de gestión de infraestructura.</p>
            </div>
          `,
        });
        results.push({ recipient: recipient.email, success: true, messageId: info.messageId });
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        results.push({ recipient: recipient.email, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      message: 'Notification emails sent',
    });
  } catch (error) {
    console.error('Error sending cut approval notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications', details: error.message });
  }
});

// Endpoint para enviar PDF comparativo de cotizaciones a Felipe Bustamante
router.post('/quotation-comparative', authenticateToken, async (req, res) => {
  try {
    const { quotationId, quotationTitle, pdfUrl, comparatives } = req.body;

    if (!quotationId || !quotationTitle || !pdfUrl) {
      return res.status(400).json({ error: 'quotationId, quotationTitle, and pdfUrl are required' });
    }

    const felipeEmail = 'fbustamante@partequipos.com';

    // Preparar información de comparativos
    let comparativesHTML = '';
    if (comparatives) {
      if (comparatives.comparativo_por_monto && comparatives.comparativo_por_monto.length > 0) {
        comparativesHTML += '<div style="margin: 20px 0;"><h3 style="color: #cf1b22;">Comparativo por Monto:</h3><ol>';
        comparatives.comparativo_por_monto.forEach((item, index) => {
          comparativesHTML += `<li><strong>${item.provider}:</strong> $${item.amount?.toLocaleString('es-CO') || 'N/A'}</li>`;
        });
        comparativesHTML += '</ol></div>';
      }

      if (comparatives.comparativo_por_valor && comparatives.comparativo_por_valor.length > 0) {
        comparativesHTML += '<div style="margin: 20px 0;"><h3 style="color: #cf1b22;">Comparativo por Valor:</h3><ol>';
        comparatives.comparativo_por_valor.forEach((item, index) => {
          const unitValue = item.unitValue ? item.unitValue.toFixed(2) : 'N/A';
          comparativesHTML += `<li><strong>${item.provider}:</strong> $${unitValue} por unidad</li>`;
        });
        comparativesHTML += '</ol></div>';
      }

      if (comparatives.comparativo_por_descripcion && comparatives.comparativo_por_descripcion.length > 0) {
        comparativesHTML += '<div style="margin: 20px 0;"><h3 style="color: #cf1b22;">Comparativo por Descripción:</h3><ol>';
        comparatives.comparativo_por_descripcion.forEach((item, index) => {
          comparativesHTML += `<li><strong>${item.provider}</strong></li>`;
        });
        comparativesHTML += '</ol></div>';
      }
    }

    const subject = `📊 Comparativo de Cotizaciones - ${quotationTitle}`;
    const message = `
      Se ha generado un nuevo comparativo de cotizaciones que requiere su revisión.

      Título: ${quotationTitle}
      
      Se ha generado un PDF comparativo con el análisis detallado de las tres cotizaciones.
      
      ${comparativesHTML.replaceAll(/<[^>]*>/g, '')}

      Por favor, revise el PDF adjunto en el sistema o descárguelo desde el siguiente enlace:
      ${pdfUrl}

      Puede acceder al comparativo completo en el sistema de gestión de infraestructura.
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #cf1b22;">Comparativo de Cotizaciones</h2>
        <p>Se ha generado un nuevo comparativo de cotizaciones que requiere su revisión.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #cf1b22;">
          <h3>Información del Comparativo:</h3>
          <ul>
            <li><strong>Título:</strong> ${quotationTitle}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</li>
          </ul>
        </div>

        ${comparativesHTML}

        <div style="background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-left: 4px solid #2196f3;">
          <h3>PDF Comparativo Generado</h3>
          <p>Se ha generado un PDF comparativo con el análisis detallado de las tres cotizaciones.</p>
          <p><a href="${pdfUrl}" style="color: #2196f3; text-decoration: none; font-weight: bold;">Descargar PDF Comparativo</a></p>
        </div>

        <p>Por favor, revise el comparativo completo en el sistema de gestión de infraestructura.</p>

        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Este es un correo automático del sistema de gestión de infraestructura.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: 'fradurgo19@gmail.com',
      to: felipeEmail,
      subject,
      text: message,
      html: htmlContent,
    });

    res.json({
      success: true,
      messageId: info.messageId,
      message: 'PDF comparativo enviado a Felipe Bustamante',
    });
  } catch (error) {
    console.error('Error sending quotation comparative email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

export default router;

