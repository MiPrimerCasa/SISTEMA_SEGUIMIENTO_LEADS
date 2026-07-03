import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

/** Webhook de n8n para transcripción y evaluación de audio (llamado server-to-server para evitar CORS). */
const WEBHOOK_URL =
  process.env.N8N_EVALUAR_AUDIO_URL ||
  'https://miprimercasa.app.n8n.cloud/webhook/evaluar-audio';

/** La transcripción es asincrónica y puede tardar 1-3 min; dejamos margen. */
const TIMEOUT_MS = 4 * 60_000;

/**
 * Reenvía los bytes del audio a n8n y devuelve { status, body } listo para responder al cliente.
 * Se usa tanto para audio recién elegido en el navegador como para grabaciones ya guardadas.
 */
export async function forwardAudioBufferToN8n(buffer, filename, mimetype) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append(
      'audio',
      new Blob([buffer], { type: mimetype || 'application/octet-stream' }),
      filename,
    );

    const upstream = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    const bodyText = await upstream.text();

    if (!upstream.ok) {
      console.error(`[audio/evaluar] n8n respondió ${upstream.status}:`, bodyText.slice(0, 500));
      return {
        status: 502,
        body: {
          message: `El flujo de n8n respondió con error (${upstream.status}).`,
          detail: bodyText.slice(0, 2000),
        },
      };
    }

    let data;
    try {
      data = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      console.error('[audio/evaluar] n8n no devolvió JSON:', bodyText.slice(0, 500));
      return {
        status: 502,
        body: {
          message:
            'El flujo de n8n respondió pero no devolvió un JSON válido. Revisá el nodo de respuesta en n8n.',
          detail: bodyText.slice(0, 2000),
        },
      };
    }

    if (typeof data.evaluacion !== 'string') {
      console.error('[audio/evaluar] respuesta sin campo "evaluacion":', bodyText.slice(0, 500));
      return {
        status: 502,
        body: {
          message: 'El flujo de n8n no devolvió el campo "evaluacion" esperado.',
          detail: bodyText.slice(0, 2000),
        },
      };
    }

    return {
      status: 200,
      body: {
        evaluacion: data.evaluacion,
        transcripcion: typeof data.transcripcion === 'string' ? data.transcripcion : undefined,
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error('[audio/evaluar] Error al contactar n8n:', error);
    return {
      status: 502,
      body: {
        message: aborted
          ? 'El flujo de n8n tardó demasiado en responder.'
          : 'No se pudo conectar con el flujo de evaluación de audio.',
        detail: error instanceof Error ? error.message : 'Error desconocido',
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function registerAudioEvaluacionRoutes(api, { usuarioDesdeRequest }) {
  api.post('/audio/evaluar', (req, res) => {
    upload.single('audio')(req, res, async (err) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
        return res.status(400).json({ message: msg });
      }

      const usuario = usuarioDesdeRequest(req);
      if (!usuario) {
        return res.status(401).json({ message: 'Sesión inválida. Volvé a iniciar sesión.' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Falta el archivo de audio.' });
      }

      const { status, body } = await forwardAudioBufferToN8n(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
      return res.status(status).json(body);
    });
  });
}
