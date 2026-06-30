import { createInternalRequestWithTask } from '../server/src/services/internalRequestFlow.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const result = await createInternalRequestWithTask(req.body, { isPublic: true });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({
      id: result.request.id,
      taskId: result.task?.id ?? null,
    });
  } catch (error) {
    const status = error?.statusCode || 500;
    console.error('Create public internal request error:', error);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al crear la solicitud',
    });
  }
}
