import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    // 프로파일링 통합 추가
    nodeProfilingIntegration(),
  ],
  // 트레이싱 샘플링 비율 설정
  tracesSampleRate: 1.0,
  // 프로파일링 샘플링 비율 설정 (tracesSampleRate에 상대적)
  profilesSampleRate: 1.0,
});
