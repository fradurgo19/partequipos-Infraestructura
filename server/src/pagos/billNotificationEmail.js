import { supabase } from '../lib/supabaseClient.js';
import { formatMailFrom, sendMailWithTimeout } from '../lib/mailTransporter.js';

const BILL_NOTIFICATION_TO = [
  'cduque@partequipos.com',
  'contabilidad1@partequipos.com',
];

const BILL_NOTIFICATION_CC = [
  'contabilidad3@partequipos.com',
  'contabilidad4@partequipos.com',
  'analista.contabilidad1@partequipos.com',
];

const EMAIL_SEND_TIMEOUT_WITH_ATTACHMENT_MS = 25000;

const SERVICE_TYPE_LABELS = {
  electricity: 'Energía',
  water: 'Agua',
  gas: 'Gas',
  internet: 'Internet',
  phone: 'Teléfono',
  cellular: 'Celular',
  waste: 'Aseo',
  sewer: 'Alcantarillado',
  public_lighting: 'Alumbrado Público',
  security: 'Seguridad',
  administration: 'Administración',
  rent: 'Arrendamiento',
  other: 'Otro',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  overdue: 'Vencido',
  paid: 'Pagado',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const translateServiceType = (serviceType) =>
  SERVICE_TYPE_LABELS[serviceType] || serviceType || 'Servicio';

const translateStatus = (status) => STATUS_LABELS[status] || status || 'Pendiente';

const formatCurrency = (value) => {
  const amount = Number.parseFloat(value) || 0;
  return `$ ${amount.toLocaleString('es-CO')}`;
};

const formatLongDate = (value) => {
  if (!value) return 'N/A';
  const normalized = String(value).includes('T') ? String(value) : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatConsumption = (bill) => {
  if (bill.consumption == null || bill.consumption === '') return null;
  const unit = bill.unit_of_measure ? ` ${bill.unit_of_measure}` : '';
  return `${bill.consumption}${unit}`;
};

const getAppBaseUrl = () =>
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://partequipos-infraestructura.vercel.app';

const resolveRegistrarProfile = async (pagosUser) => {
  if (pagosUser?.fullName) {
    return {
      fullName: pagosUser.fullName,
      email: pagosUser.email || '',
    };
  }

  if (!pagosUser?.id || !supabase) {
    return {
      fullName: pagosUser?.email || 'Usuario del sistema',
      email: pagosUser?.email || '',
    };
  }

  const { data } = await supabase
    .from('pagos_profiles')
    .select('full_name, email')
    .eq('id', pagosUser.id)
    .maybeSingle();

  return {
    fullName: data?.full_name || pagosUser.email || 'Usuario del sistema',
    email: data?.email || pagosUser.email || '',
  };
};

const getAttachmentContentType = (filename) => {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
};

const fetchDocumentAttachment = async (documentUrl, documentName) => {
  if (!documentUrl) return null;

  try {
    const response = await fetch(documentUrl);
    if (!response.ok) return null;

    const content = Buffer.from(await response.arrayBuffer());
    const filename = documentName || documentUrl.split('/').pop() || 'documento-factura.pdf';

    return { filename, content };
  } catch (error) {
    console.error('No se pudo descargar el documento para adjuntar al correo:', error);
    return null;
  }
};

const buildDetailRow = (label, value) => `
  <tr>
    <td style="padding:10px 12px;border-bottom:1px solid #ececec;font-weight:600;color:#50504f;width:38%;vertical-align:top;">
      ${escapeHtml(label)}:
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #ececec;color:#333;vertical-align:top;">
      ${escapeHtml(value)}
    </td>
  </tr>
`;

const buildBillEmailContent = (bill, registrar, attachment) => {
  const serviceLabel = translateServiceType(bill.service_type);
  const contractNumber = bill.contract_number || bill.invoice_number || 'Sin número';
  const subject = `Nueva Factura Registrada - ${contractNumber} - ${serviceLabel}`;
  const registrarLabel = registrar.email
    ? `${registrar.fullName} (${registrar.email})`
    : registrar.fullName;
  const documentUrl = bill.document_url || '';
  const documentName = bill.document_name || 'Documento de factura';
  const consumption = formatConsumption(bill);
  const appUrl = getAppBaseUrl();
  const billsUrl = `${appUrl.replace(/\/$/, '')}/pagos/bills`;
  const notes = bill.notes?.trim() || '';
  const noteMessage = notes
    ? `${notes}\n\nPor favor, revisa esta factura en el sistema y apruébala si corresponde.`
    : 'Por favor, revisa esta factura en el sistema y apruébala si corresponde.';

  const detailRows = [
    buildDetailRow('Tipo de Servicio', serviceLabel),
    buildDetailRow('Proveedor', bill.provider || 'N/A'),
    buildDetailRow('Número de Factura', bill.invoice_number || 'N/A'),
    buildDetailRow('Periodo', bill.period || 'N/A'),
    buildDetailRow('Monto Total', formatCurrency(bill.total_amount)),
    buildDetailRow('Fecha de Vencimiento', formatLongDate(bill.due_date)),
    buildDetailRow('Ubicación', bill.location || 'N/A'),
    buildDetailRow('Centro de Costos', bill.cost_center || 'N/A'),
    buildDetailRow('Estado', translateStatus(bill.status)),
    buildDetailRow('Descripción', bill.description || 'N/A'),
  ];

  if (consumption) {
    detailRows.push(buildDetailRow('Consumo', consumption));
  }

  const documentLinkHtml = documentUrl
    ? `<p style="margin:18px 0 8px;font-size:15px;">
        📎 Documento adjunto:
        <a href="${escapeHtml(documentUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cf1b22;font-weight:600;text-decoration:none;">
          ${escapeHtml(documentName)}
        </a>
      </p>`
    : '';

  const documentTextLine = documentUrl
    ? `Documento adjunto: ${documentName}\n${documentUrl}\n`
    : '';

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;background:#ffffff;color:#333;">
      <div style="background:linear-gradient(135deg,#cf1b22 0%,#a11217 100%);padding:24px 28px;color:#ffffff;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">📄 Nueva Factura Registrada</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.92;">Sistema de Gestión de Facturas</p>
      </div>

      <div style="padding:28px;">
        <p style="font-size:15px;line-height:1.6;margin-top:0;">Hola,</p>
        <p style="font-size:15px;line-height:1.6;">
          Se ha registrado una nueva factura en el sistema por <strong>${escapeHtml(registrar.fullName)}</strong>.
        </p>

        <div style="background:#f8f8f8;border-left:4px solid #cf1b22;padding:14px 16px;margin:22px 0;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#50504f;">📋 CONTRATO: ${escapeHtml(contractNumber)}</p>
        </div>

        <h2 style="font-size:18px;color:#50504f;margin:0 0 12px;">📋 Detalles de la Factura</h2>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
          ${detailRows.join('')}
        </table>

        <p style="margin:20px 0 6px;font-size:14px;color:#50504f;">
          <strong>Registrado por:</strong> ${escapeHtml(registrarLabel)}
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#50504f;">
          <strong>Fecha de registro:</strong> ${escapeHtml(formatLongDate(bill.created_at))}
        </p>

        <div style="background:#fff8e6;border:1px solid #f0d9a6;border-radius:8px;padding:14px 16px;margin-bottom:18px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#50504f;">Nota:</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#555;white-space:pre-line;">
            ${escapeHtml(noteMessage)}
          </p>
        </div>

        ${documentLinkHtml}

        <div style="text-align:center;margin:28px 0 10px;">
          <a href="${escapeHtml(billsUrl)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;background:#cf1b22;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;">
            Ver en el Sistema
          </a>
        </div>

        <p style="margin:24px 0 0;font-size:12px;color:#888;line-height:1.5;text-align:center;">
          Este es un correo automático del Sistema de Gestión de Facturas.<br />
          Por favor, no responder a este correo.
        </p>
      </div>
    </div>
  `;

  const text = [
    'Nueva Factura Registrada',
    'Sistema de Gestión de Facturas',
    '',
    'Hola,',
    '',
    `Se ha registrado una nueva factura en el sistema por ${registrar.fullName}.`,
    '',
    `CONTRATO: ${contractNumber}`,
    '',
    'Detalles de la Factura',
    `Tipo de Servicio: ${serviceLabel}`,
    `Proveedor: ${bill.provider || 'N/A'}`,
    `Número de Factura: ${bill.invoice_number || 'N/A'}`,
    `Periodo: ${bill.period || 'N/A'}`,
    `Monto Total: ${formatCurrency(bill.total_amount)}`,
    `Fecha de Vencimiento: ${formatLongDate(bill.due_date)}`,
    `Ubicación: ${bill.location || 'N/A'}`,
    `Centro de Costos: ${bill.cost_center || 'N/A'}`,
    `Estado: ${translateStatus(bill.status)}`,
    `Descripción: ${bill.description || 'N/A'}`,
    consumption ? `Consumo: ${consumption}` : null,
    '',
    `Registrado por: ${registrarLabel}`,
    `Fecha de registro: ${formatLongDate(bill.created_at)}`,
    '',
    notes ? `Nota: ${notes}` : 'Nota:',
    noteMessage,
    '',
    documentTextLine,
    `Ver en el Sistema: ${billsUrl}`,
    '',
    'Este es un correo automático del Sistema de Gestión de Facturas.',
    'Por favor, no responder a este correo.',
  ]
    .filter(Boolean)
    .join('\n');

  const mailOptions = {
    from: formatMailFrom(),
    to: BILL_NOTIFICATION_TO.join(', '),
    cc: BILL_NOTIFICATION_CC.join(', '),
    subject,
    text,
    html,
  };

  if (attachment) {
    mailOptions.attachments = [
      {
        filename: attachment.filename,
        content: attachment.content,
        contentType: getAttachmentContentType(attachment.filename),
      },
    ];
  }

  return mailOptions;
};

export const notifyNewBillRegistered = async (bill, pagosUser) => {
  if (!bill) return;

  const registrar = await resolveRegistrarProfile(pagosUser);
  const attachment = await fetchDocumentAttachment(bill.document_url, bill.document_name);
  const mailOptions = buildBillEmailContent(bill, registrar, attachment);
  const timeoutMs = attachment ? EMAIL_SEND_TIMEOUT_WITH_ATTACHMENT_MS : undefined;

  await sendMailWithTimeout(mailOptions, timeoutMs);
};
