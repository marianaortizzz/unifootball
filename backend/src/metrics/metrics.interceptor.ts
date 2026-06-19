import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import { Histogram } from 'prom-client';
import { HTTP_DURATION } from './metrics.constants';

/**
 * Interceptor que mide cada request HTTP y alimenta el histograma RED:
 *  - Rate     -> número de observaciones (_count) por unidad de tiempo
 *  - Errors   -> filtrando por la etiqueta status_code (4xx/5xx)
 *  - Duration -> los buckets del histograma + suma/promedio
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @Inject(HTTP_DURATION)
    private readonly httpDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const stopTimer = this.httpDuration.startTimer();

    // Se registra al terminar la respuesta para capturar el status_code final
    // (incluso cuando un filtro de excepción lo cambia a 4xx/5xx).
    res.on('finish', () => {
      // req.route está tipado como `any` en Express; se extrae de forma segura.
      const routePath = (req.route as { path?: string } | undefined)?.path;
      stopTimer({
        method: req.method,
        route: routePath ?? req.path ?? 'unknown',
        status_code: String(res.statusCode),
      });
    });

    return next.handle();
  }
}
