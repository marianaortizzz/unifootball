import pino from 'pino';
import type { DestinationStream } from 'pino';
import { redactPaths } from './logger.options';

// Captura una línea de log JSON producida por Pino con la config de redacción.
function captureLog(write: (logger: pino.Logger) => void): string {
  let output = '';
  const stream: DestinationStream = {
    write: (chunk: string) => {
      output += chunk;
    },
  };
  const logger = pino(
    { redact: { paths: redactPaths, censor: '[REDACTED]' } },
    stream,
  );
  write(logger);
  return output;
}

describe('Logger — redacción de datos sensibles (11.1 Logs)', () => {
  it('produce salida JSON parseable (logging estructurado)', () => {
    const line = captureLog((l) => l.info({ foo: 'bar' }, 'mensaje'));
    const parsed = JSON.parse(line) as { foo: string; msg: string };
    expect(parsed.foo).toBe('bar');
    expect(parsed.msg).toBe('mensaje');
  });

  it('oculta el header Authorization (token JWT)', () => {
    const line = captureLog((l) =>
      l.info(
        { req: { headers: { authorization: 'Bearer super-secret-jwt' } } },
        'request',
      ),
    );
    expect(line).not.toContain('super-secret-jwt');
    expect(line).toContain('[REDACTED]');
  });

  it('oculta passwords en el nivel superior y anidados', () => {
    const line = captureLog((l) =>
      l.info(
        { password: 'top-secret', user: { password: 'nested-secret' } },
        'login',
      ),
    );
    expect(line).not.toContain('top-secret');
    expect(line).not.toContain('nested-secret');
  });

  it('oculta cookies', () => {
    const line = captureLog((l) =>
      l.info(
        { req: { headers: { cookie: 'session=abc123; theme=dark' } } },
        'request',
      ),
    );
    expect(line).not.toContain('abc123');
  });
});
