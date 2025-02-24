import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, body, query, headers } = request;
    const startTime = Date.now();

    // 응답 로깅
    response.on('finish', () => {
      const { statusCode } = response;
      const responseTime = Date.now() - startTime;

      const log = {
        timestamp: new Date().toISOString(),
        context: 'HTTP',
        request: {
          method,
          path: originalUrl,
          query,
          headers: this.filterSensitiveHeaders(headers),
          body: this.filterSensitiveData(body),
        },
        response: {
          statusCode,
          responseTime,
        },
      };

      if (statusCode >= 400) {
        this.logger.error('HTTP Transaction Error', log);
      } else {
        this.logger.info('HTTP Transaction Success', log);
      }
    });

    next();
  }

  private filterSensitiveHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    const filteredHeaders = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (filteredHeaders[header]) {
        filteredHeaders[header] = '[FILTERED]';
      }
    });

    return filteredHeaders;
  }

  private filterSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
    const filteredData = { ...data };

    Object.keys(filteredData).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        filteredData[key] = '[FILTERED]';
      }
    });

    return filteredData;
  }
}
