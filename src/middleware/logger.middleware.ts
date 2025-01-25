import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

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

    this.logger.log(requestLog);

    // 응답 로깅
    response.on('finish', () => {
      const { statusCode } = response;
      const responseTime = Date.now() - startTime;

      const responseLog = {
        type: 'RESPONSE',
        method,
        path: originalUrl,
        statusCode,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 400) {
        this.logger.error(responseLog);
      } else {
        this.logger.log(responseLog);
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
