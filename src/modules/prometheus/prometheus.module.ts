import { Module } from '@nestjs/common';
import { PrometheusModule as NestPrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    NestPrometheusModule.register({
      path: '/monitoring/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class PrometheusModule {}
