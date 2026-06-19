import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import {
  BUSINESS_COUNTER,
  HTTP_DURATION,
  METRICS_REGISTRY,
} from './metrics.constants';

// Registro propio (no el global) para aislar las métricas de la app.
const registry = new Registry();
// Métricas por defecto del proceso Node (CPU, memoria, event loop...).
collectDefaultMetrics({ register: registry });

// RED por endpoint: Rate (_count), Errors (label status_code), Duration (buckets).
const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las requests HTTP en segundos (RED por endpoint)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// Business metrics: eventos de negocio (registros, logins...).
const businessCounter = new Counter({
  name: 'unifootball_business_events_total',
  help: 'Eventos de negocio acumulados (registros, logins, etc.)',
  labelNames: ['event'],
  registers: [registry],
});

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    { provide: METRICS_REGISTRY, useValue: registry },
    { provide: HTTP_DURATION, useValue: httpDuration },
    { provide: BUSINESS_COUNTER, useValue: businessCounter },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [BUSINESS_COUNTER],
})
export class MetricsModule {}
