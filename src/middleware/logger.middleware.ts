import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject, Logger } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, body, query, headers } = request;
    const startTime = Date.now();

    // 요청 로깅
    const requestLog = {
      type: 'REQUEST',
      method,
      path: originalUrl,
      query,
      headers: this.filterSensitiveHeaders(headers),
      body: this.filterSensitiveData(body),
      timestamp: new Date().toISOString(),
    };

    this.logger.log({
      level: 'info',
      message: 'HTTP Request',
      ...requestLog,
    });

    // 응답 로깅
    response.on('finish', () => {
      const { statusCode } = response;
      const responseTime = Date.now() - startTime;

      const responseLog = {
        type: 'RESPONSE',
        method,
        path: originalUrl,
        statusCode,
        responseTime,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 400) {
        this.logger.error({
          level: 'error',
          message: 'HTTP Response Error',
          ...responseLog,
        });
      } else {
        this.logger.log({
          level: 'info',
          message: 'HTTP Response Success',
          ...responseLog,
        });
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
