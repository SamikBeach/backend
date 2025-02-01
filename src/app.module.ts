import { Module } from '@nestjs/common';
import { CacheKeyInterceptor } from '@common/interceptors/cache-key.interceptor';

@Module({
  imports: [
    // ... existing imports ...
  ],
  providers: [
    // ... existing providers ...
    CacheKeyInterceptor,
  ],
})
export class AppModule {
  // ... existing code ...
}
