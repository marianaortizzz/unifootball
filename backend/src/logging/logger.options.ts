import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Campos que NUNCA deben aparecer en los logs (tokens, cookies, passwords, PII).
 * Se exporta para poder testear la redacción de forma aislada.
 */
export const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'req.body.password',
  'req.body.token',
];

/**
 * Configuración de logging estructurado (Pino) para el punto 11.1 (Logs):
 *  - Salida JSON estructurada (una línea por evento) -> fácil de indexar/buscar.
 *  - Niveles correctos (error/warn/info/debug) según el resultado del request.
 *  - Correlation ID por request (header x-request-id entrante o uno nuevo).
 *  - Redacción de datos sensibles (Authorization, cookies, passwords).
 */
export const loggerOptions: Params = {
  pinoHttp: {
    // En producción JSON puro (info+); en desarrollo, salida legible (debug+).
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),

    // Trazabilidad end-to-end: un id por cada request, devuelto en la respuesta.
    genReqId: (req: IncomingMessage, res: ServerResponse): string => {
      const incoming = req.headers['x-request-id'];
      const id =
        (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },

    // Niveles según el resultado: 5xx/errores -> error, 4xx -> warn, resto info.
    customLogLevel: (
      _req: IncomingMessage,
      res: ServerResponse,
      err?: Error,
    ): 'error' | 'warn' | 'info' => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },

    // Nunca registrar secretos.
    redact: { paths: redactPaths, censor: '[REDACTED]' },

    // Mensajes más claros de inicio/fin de request.
    customSuccessMessage: (req) => `${req.method} ${req.url}`,
    customErrorMessage: (req, _res, err) =>
      `${req.method} ${req.url} -> ${err.message}`,

    // Desarrollo: salida bonita. Producción: JSON sin transform (más rápido).
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: { singleLine: true, translateTime: 'SYS:standard' },
        },
  },
};
