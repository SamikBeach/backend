import { ExecutionContext, Injectable } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class CacheKeyInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { url, query, params } = request;

    // 기본 URL 경로
    let cacheKey = url.split('?')[0];

    // 페이지네이션/검색 쿼리가 있는 경우
    if (Object.keys(query).length > 0) {
      cacheKey += `:${JSON.stringify(query)}`;
    }

    // URL 파라미터가 있는 경우
    if (Object.keys(params).length > 0) {
      cacheKey += `:${JSON.stringify(params)}`;
    }

    return cacheKey;
  }
}
