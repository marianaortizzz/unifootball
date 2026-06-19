import { Controller, Get, Header, Inject } from '@nestjs/common';
import { Registry } from 'prom-client';
import { METRICS_REGISTRY } from './metrics.constants';

/**
 * Endpoint de scrape para Prometheus / Grafana: GET /metrics
 * Devuelve todas las métricas en el formato de texto de Prometheus.
 */
@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(METRICS_REGISTRY)
    private readonly registry: Registry,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
