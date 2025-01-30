import * as Sentry from '@sentry/nestjs';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Enable allure of performance monitoring features
  enableTracing: true,

  integrations: [
    // Add profiling integration
    new ProfilingIntegration(),
    // Enable automatic instrumentation for NestJS
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
  ],

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: [
    'localhost',
    process.env.SERVICE_URL,
    /^https:\/\/[^/]*\.classciswalk\.com/,
  ],

  // Optional: Set environment
  environment: process.env.NODE_ENV || 'development',
});
