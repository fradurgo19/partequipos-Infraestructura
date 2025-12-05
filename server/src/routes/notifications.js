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
      html: html || message.replace(/\n/g, '<br>'),
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

// Endpoint para enviar notificaciones de tareas según presupuesto
router.post('/task-budget', authenticateToken, async (req, res) => {
  try {
    const { taskTitle, budget, taskId, requesterName } = req.body;

    if (!budget || !taskTitle) {
      return res.status(400).json({ error: 'budget and taskTitle are required' });
    }

    const budgetNum = parseFloat(budget);
    let recipients = [];

    if (budgetNum > 10000000) {
      // Mayor a 10M → Notificar a Felipe (Director) y Pedro Cano
      recipients = [
        { email: 'fbustamante@partequipos.com', name: 'ANDRES FELIPE BUSTAMANTE CESPEDES' },
        { email: 'pedro.cano@partequipos.com', name: 'Pedro Cano' },
      ];
    } else if (budgetNum > 5000000) {
      // Entre 5M y 10M → Notificar a Felipe (Director)
      recipients = [
        { email: 'fbustamante@partequipos.com', name: 'ANDRES FELIPE BUSTAMANTE CESPEDES' },
      ];
    } else if (budgetNum > 0 && budgetNum <= 5000000) {
      // Hasta 5M → Notificar a Edison (Ingeniero)
      recipients = [
        { email: 'infraestructura@partequipos.com', name: 'EDISON VALENCIA' },
      ];
    }

    const results = [];
    for (const recipient of recipients) {
      try {
        const subject = budgetNum > 10000000
          ? `🚨 Tarea de Alto Presupuesto - ${taskTitle}`
          : budgetNum > 5000000
          ? `⚠️ Tarea Requiere Aprobación - ${taskTitle}`
          : `📋 Nueva Tarea - ${taskTitle}`;

        const message = budgetNum > 10000000
          ? `Se ha creado una tarea con presupuesto de $${budgetNum.toLocaleString('es-CO')} que requiere su revisión y aprobación.\n\nTarea: ${taskTitle}\nSolicitante: ${requesterName || 'N/A'}\n\nPor favor, revise la tarea en el sistema.`
          : budgetNum > 5000000
          ? `Se ha creado una tarea con presupuesto de $${budgetNum.toLocaleString('es-CO')} que requiere su aprobación.\n\nTarea: ${taskTitle}\nSolicitante: ${requesterName || 'N/A'}\n\nPor favor, revise la tarea en el sistema.`
          : `Se ha creado una nueva tarea con presupuesto de $${budgetNum.toLocaleString('es-CO')}.\n\nTarea: ${taskTitle}\nSolicitante: ${requesterName || 'N/A'}\n\nPuede revisar la tarea en el sistema.`;

        const info = await transporter.sendMail({
          from: 'fradurgo19@gmail.com',
          to: recipient.email,
          subject,
          text: message,
          html: message.replace(/\n/g, '<br>'),
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

    const cutValueNum = parseFloat(cutValue || 0);
    
    // Siempre enviar a Edison primero
    const edisonEmail = 'infraestructura@partequipos.com';
    const edisonName = 'EDISON VALENCIA';

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
        text: edisonMessage.replace(/<[^>]*>/g, ''),
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

    const cutValueNum = parseFloat(cutValue || 0);
    const recipients = [];

    // Siempre notificar a Felipe
    recipients.push({ email: 'fbustamante@partequipos.com', name: 'ANDRES FELIPE BUSTAMANTE CESPEDES' });

    // Si el valor supera 10M, también notificar a Pedro y Claudia
    if (cutValueNum > 10000000) {
      recipients.push({ email: 'pedro.cano@partequipos.com', name: 'Pedro Cano' });
      recipients.push({ email: 'claudia.cano@partequipos.com', name: 'Claudia Cano' });
    }

    const results = [];
    for (const recipient of recipients) {
      try {
        const subject = cutValueNum > 10000000
          ? `🚨 Corte de Alto Valor Aprobado por Edison - ${cutTitle}`
          : `✅ Corte Aprobado por Edison - ${cutTitle}`;

        const message = cutValueNum > 10000000
          ? `Edison ha aprobado y firmado un corte con valor de $${cutValueNum.toLocaleString('es-CO')} que requiere su revisión final.

Corte: ${cutTitle}
Sede: ${siteName || 'N/A'}
${taskTitle ? `Tarea Asociada: ${taskTitle}` : ''}

Por favor, revise y apruebe el corte en el sistema.`
          : `Edison ha aprobado y firmado un corte que requiere su revisión.

Corte: ${cutTitle}
Sede: ${siteName || 'N/A'}
${taskTitle ? `Tarea Asociada: ${taskTitle}` : ''}
Valor: $${cutValueNum.toLocaleString('es-CO')}

Por favor, revise y apruebe el corte en el sistema.`;

        const info = await transporter.sendMail({
          from: 'fradurgo19@gmail.com',
          to: recipient.email,
          subject,
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #cf1b22;">${cutValueNum > 10000000 ? '🚨 Corte de Alto Valor' : '✅ Corte Aprobado'}</h2>
              <p>Edison ha aprobado y firmado un corte que requiere su revisión.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #cf1b22;">
                <h3>Información del Corte:</h3>
                <ul>
                  <li><strong>Corte:</strong> ${cutTitle}</li>
                  <li><strong>Sede:</strong> ${siteName || 'N/A'}</li>
                  ${taskTitle ? `<li><strong>Tarea Asociada:</strong> ${taskTitle}</li>` : ''}
                  <li><strong>Valor:</strong> $${cutValueNum.toLocaleString('es-CO')}</li>
                </ul>
              </div>

              <p>Por favor, revise y apruebe el corte en el sistema.</p>

              <p style="margin-top: 30px; color: #666; font-size: 12px;">
                Este es un correo automático del sistema de gestión de infraestructura.
              </p>
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
    const felipeName = 'ANDRES FELIPE BUSTAMANTE CESPEDES';

    // Preparar información de comparativos
    let comparativesHTML = '';
    if (comparatives) {
      if (comparatives.comparativo_por_monto && comparatives.comparativo_por_monto.length > 0) {
        comparativesHTML += '<div style="margin: 20px 0;"><h3 style="color: #cf1b22;">Comparativo por Monto:</h3><ol>';
        comparatives.comparativo_por_monto.forEach((item: any, index: number) => {
          comparativesHTML += `<li><strong>${item.provider}:</strong> $${item.amount?.toLocaleString('es-CO') || 'N/A'}</li>`;
        });
        comparativesHTML += '</ol></div>';
      }

      if (comparatives.comparativo_por_valor && comparatives.comparativo_por_valor.length > 0) {
        comparativesHTML += '<div style="margin: 20px 0;"><h3 style="color: #cf1b22;">Comparativo por Valor:</h3><ol>';
        comparatives.comparativo_por_valor.forEach((item: any, index: number) => {
          const unitValue = item.unitValue ? item.unitValue.toFixed(2) : 'N/A';
          comparativesHTML += `<li><strong>${item.provider}:</strong> $${unitValue} por unidad</li>`;
        });
        comparativesHTML += '</ol></div>';
      }

      if (comparatives.comparativo_por_descripcion && comparatives.comparativo_por_descripcion.length > 0) {
        comparativesHTML += '<div style="margin: 20px 0;"><h3 style="color: #cf1b22;">Comparativo por Descripción:</h3><ol>';
        comparatives.comparativo_por_descripcion.forEach((item: any, index: number) => {
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
      
      ${comparativesHTML.replace(/<[^>]*>/g, '')}

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

