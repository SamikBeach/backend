import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PrometheusModule as NestPrometheusModule } from '@willsoto/nestjs-prometheus';
import { Request, Response, NextFunction } from 'express';

// Basic Auth Middleware
const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required.');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64')
    .toString()
    .split(':');
  const user = auth[0];
  const pass = auth[1];

  // 환경변수에서 인증 정보 확인
  if (
    user === process.env.METRICS_USER &&
    pass === process.env.METRICS_PASSWORD
  ) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required.');
  }
};

@Module({
  imports: [
    NestPrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class PrometheusModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(basicAuth).forRoutes('/metrics');
  }
}
