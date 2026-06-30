import { supabase } from '../lib/supabaseClient.js';
import { formatMailFrom, sendMailWithTimeout } from '../lib/mailTransporter.js';

const parseOptionalNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value, fieldName, { required = false, maxLength = 500 } = {}) => {
  const text = String(value ?? '').trim();
  if (required && !text) {
    const error = new Error(`${fieldName} es requerido`);
    error.statusCode = 400;
    throw error;
  }
  if (text.length > maxLength) {
    const error = new Error(`${fieldName} es demasiado largo`);
    error.statusCode = 400;
    throw error;
  }
  return text;
};

export const validateInternalRequestPayload = (payload) => ({
  title: normalizeText(payload.title, 'El título', { required: true, maxLength: 200 }),
  description: normalizeText(payload.description, 'La descripción', { required: true, maxLength: 5000 }),
  department: normalizeText(payload.department, 'El departamento', { required: true, maxLength: 120 }),
  site_id: normalizeText(payload.site_id, 'La sede', { required: true, maxLength: 64 }),
  requester_name: normalizeText(payload.requester_name, 'El nombre de quien solicita', {
    required: true,
    maxLength: 200,
  }),
  request_date: normalizeText(payload.request_date, 'La fecha de solicitud', { required: true, maxLength: 32 }),
  measurement_length: parseOptionalNumber(payload.measurement_length),
  measurement_height: parseOptionalNumber(payload.measurement_height),
  measurement_depth: parseOptionalNumber(payload.measurement_depth),
  photo_urls: Array.isArray(payload.photo_urls) ? payload.photo_urls.filter(Boolean).slice(0, 20) : [],
  design_urls: Array.isArray(payload.design_urls) ? payload.design_urls.filter(Boolean).slice(0, 20) : [],
});

const resolveFallbackProfileId = async () => {
  if (process.env.INTERNAL_REQUEST_FALLBACK_USER_ID) {
    return process.env.INTERNAL_REQUEST_FALLBACK_USER_ID;
  }

  const { data: infrastructureUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'infrastructure')
    .limit(1)
    .maybeSingle();

  if (infrastructureUser?.id) {
    return infrastructureUser.id;
  }

  const { data: adminUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  return adminUser?.id ?? null;
};

const buildMeasuresText = (payload) => {
  const parts = [];
  if (payload.measurement_length) parts.push(`- Longitud: ${payload.measurement_length}m`);
  if (payload.measurement_height) parts.push(`- Altura: ${payload.measurement_height}m`);
  if (payload.measurement_depth) parts.push(`- Profundidad: ${payload.measurement_depth}m`);
  return parts.length ? `Medidas:\n${parts.join('\n')}` : '';
};

const buildMeasuresHtml = (payload) => {
  const items = [];
  if (payload.measurement_length) items.push(`<li>Longitud: ${payload.measurement_length}m</li>`);
  if (payload.measurement_height) items.push(`<li>Altura: ${payload.measurement_height}m</li>`);
  if (payload.measurement_depth) items.push(`<li>Profundidad: ${payload.measurement_depth}m</li>`);
  return items.length ? `<div style="margin: 20px 0;"><h3>Medidas:</h3><ul>${items.join('')}</ul></div>` : '';
};

const sendInternalRequestNotificationEmail = async ({ payload, siteName, isPublic }) => {
  const { data: infrastructureTeam } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'infrastructure');

  if (!infrastructureTeam?.length) {
    return;
  }

  const emails = infrastructureTeam.map((member) => member.email).filter(Boolean).join(', ');
  if (!emails) {
    return;
  }

  const measuresText = buildMeasuresText(payload);
  const measuresHtml = buildMeasuresHtml(payload);
  const originLabel = isPublic ? ' (formulario público)' : '';
  const requestDateLabel = new Date(payload.request_date).toLocaleDateString('es-CO');

  await sendMailWithTimeout({
    from: formatMailFrom(),
    to: emails,
    subject: `📋 Nueva Solicitud Interna${originLabel} - ${payload.title}`,
    text: `Se ha creado una nueva solicitud interna que requiere atención del equipo de infraestructura.

Solicitud: ${payload.title}
Departamento: ${payload.department}
Sede: ${siteName}
Solicitante: ${payload.requester_name}

Descripción:
${payload.description}

${measuresText}

Se ha generado automáticamente una tarea en el sistema para su seguimiento.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #cf1b22;">Nueva Solicitud Interna</h2>
        <p>Se ha creado una nueva solicitud interna que requiere atención del equipo de infraestructura.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #cf1b22;">
          <h3>Información de la Solicitud:</h3>
          <ul>
            <li><strong>Solicitud:</strong> ${payload.title}</li>
            <li><strong>Departamento:</strong> ${payload.department}</li>
            <li><strong>Sede:</strong> ${siteName}</li>
            <li><strong>Solicitante:</strong> ${payload.requester_name}</li>
            <li><strong>Fecha:</strong> ${requestDateLabel}</li>
          </ul>
        </div>
        <div style="margin: 20px 0;">
          <h3>Descripción:</h3>
          <p>${payload.description.replaceAll('\n', '<br>')}</p>
        </div>
        ${measuresHtml}
        <p style="background-color: #e3f2fd; padding: 10px; border-left: 4px solid #2196f3;">
          <strong>Nota:</strong> Se ha generado automáticamente una tarea en el sistema para su seguimiento.
        </p>
      </div>
    `,
  });
};

const insertInfrastructureNotifications = async (requestId, title, requesterName) => {
  const { data: infrastructureTeam } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'infrastructure');

  if (!infrastructureTeam?.length) {
    return;
  }

  const notifications = infrastructureTeam.map((member) => ({
    user_id: member.id,
    title: 'Nueva solicitud interna',
    message: `Nueva solicitud "${title}" enviada por ${requesterName}`,
    type: 'internal_request',
    reference_id: requestId,
  }));

  await supabase.from('notifications').insert(notifications);
};

export const createInternalRequestWithTask = async (rawPayload, options = {}) => {
  const payload = validateInternalRequestPayload(rawPayload);
  const profileId = options.profileId ?? (await resolveFallbackProfileId());

  if (!profileId) {
    const error = new Error('No hay usuario del sistema configurado para registrar solicitudes públicas');
    error.statusCode = 500;
    throw error;
  }

  const { data: site } = await supabase.from('sites').select('id, name').eq('id', payload.site_id).maybeSingle();
  if (!site) {
    const error = new Error('La sede seleccionada no es válida');
    error.statusCode = 400;
    throw error;
  }

  const requestData = {
    title: payload.title,
    description: payload.description,
    department: payload.department,
    site_id: payload.site_id,
    request_date: payload.request_date,
    requester_name: payload.requester_name,
    photo_urls: payload.photo_urls,
    measurement_length: payload.measurement_length,
    measurement_height: payload.measurement_height,
    measurement_depth: payload.measurement_depth,
    design_urls: payload.design_urls,
    created_by: profileId,
    requester_id: options.profileId ?? null,
    status: 'pending',
  };

  const { data: insertedRequest, error: requestError } = await supabase
    .from('internal_requests')
    .insert([requestData])
    .select()
    .single();

  if (requestError) {
    console.error('Error creating internal request:', requestError);
    const error = new Error('Error al crear la solicitud');
    error.statusCode = 500;
    throw error;
  }

  const taskData = {
    title: `Solicitud: ${payload.title}`,
    description: `Solicitud interna de ${payload.department}:\n\n${payload.description}`,
    task_type: 'Mantenimiento General',
    requesting_area: 'Bienes inmuebles',
    site_id: payload.site_id,
    requester_name: payload.requester_name,
    requester_id: options.profileId ?? null,
    request_date: payload.request_date,
    status: 'pending',
    photo_urls: payload.photo_urls,
    created_by: profileId,
  };

  const { data: infrastructureUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'infrastructure')
    .limit(1);

  if (infrastructureUsers?.length) {
    taskData.assignee_id = infrastructureUsers[0].id;
    taskData.assigned_to = 'Infraestructura';
  }

  const { data: createdTask, error: taskError } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();

  let linkedTask = null;
  if (taskError) {
    console.error('Error creating task for internal request:', taskError);
  } else {
    linkedTask = createdTask;
    await supabase.from('internal_requests').update({ task_id: createdTask.id }).eq('id', insertedRequest.id);
  }

  await insertInfrastructureNotifications(insertedRequest.id, payload.title, payload.requester_name);

  try {
    await sendInternalRequestNotificationEmail({
      payload,
      siteName: site.name,
      isPublic: Boolean(options.isPublic),
    });
  } catch (emailError) {
    console.error('Error sending internal request email:', emailError);
  }

  return {
    request: insertedRequest,
    task: linkedTask,
  };
};

export const listPublicInternalRequestSites = async () => {
  const { data, error } = await supabase.from('sites').select('id, name').order('name');
  if (error) {
    throw error;
  }
  return data || [];
};
