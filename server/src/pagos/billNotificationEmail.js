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

const translateServiceType = (serviceType) =>
  SERVICE_TYPE_LABELS[serviceType] || serviceType || 'Servicio';

const formatCurrency = (value) =>
  `$${(Number.parseFloat(value) || 0).toLocaleString('es-CO')}`;

const buildBillEmailContent = (bill, pagosUser) => {
  const serviceLabel = translateServiceType(bill.service_type);
  const invoiceNumber = bill.invoice_number || 'Sin número';
  const subject = `Nueva Factura Registrada - ${invoiceNumber} - ${serviceLabel}`;
  const registeredBy = pagosUser?.fullName || pagosUser?.email || 'Usuario del sistema';

  const details = [
    ['Número de factura', invoiceNumber],
    ['Tipo de servicio', serviceLabel],
    ['Proveedor', bill.provider || 'N/A'],
    ['Período', bill.period || 'N/A'],
    ['Monto total', formatCurrency(bill.total_amount)],
    ['Ciudad', bill.city || 'N/A'],
    ['Ubicación', bill.location || 'N/A'],
    ['Registrado por', registeredBy],
  ];

  const text = [
    'Se ha registrado una nueva factura en el sistema.',
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    'Este es un correo automático del Sistema de Gestión de Facturas.',
  ].join('\n');

  const rowsHtml = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${label}</td><td style="padding:8px;border-bottom:1px solid #eee;">${value}</td></tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
      <h2 style="color:#cf1b22;margin-top:0;">Nueva Factura Registrada</h2>
      <p>Se ha registrado una nueva factura en el sistema.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9f9f9;">
        ${rowsHtml}
      </table>
      <p style="color:#666;font-size:12px;">Este es un correo automático del Sistema de Gestión de Facturas.</p>
    </div>
  `;

  return { subject, text, html };
};

export const notifyNewBillRegistered = async (bill, pagosUser) => {
  if (!bill) return;

  const { subject, text, html } = buildBillEmailContent(bill, pagosUser);

  await sendMailWithTimeout({
    from: formatMailFrom(),
    to: BILL_NOTIFICATION_TO.join(', '),
    cc: BILL_NOTIFICATION_CC.join(', '),
    subject,
    text,
    html,
  });
};
