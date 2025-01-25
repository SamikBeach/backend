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
    const { method, originalUrl, body, query, params, headers, ip } = request;
    const userAgent = headers['user-agent'] || '';
    const referer = headers['referer'] || '';
    const startTime = Date.now();

    // JWT 토큰에서 유저 정보 추출
    const token = headers.authorization?.replace('Bearer ', '');
    let userId = null;
    let userEmail = null;

    if (token) {
      try {
        const decoded = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        userId = decoded.id;
        userEmail = decoded.email;
      } catch (e) {
        // 토큰 파싱 실패는 무시
      }
    }

    // URL 파싱
    let pathWithoutQuery = originalUrl;
    try {
      // 쿼리스트링 제거
      pathWithoutQuery = originalUrl.split('?')[0];
    } catch (e) {
      // URL 파싱 실패 시 원본 URL 사용
      this.logger.warn('URL parsing failed', {
        url: originalUrl,
        error: e.message,
      });
    }

    // 요청 로깅
    try {
      const requestLog = {
        type: 'REQUEST',
        method,
        path: pathWithoutQuery,
        full_url: originalUrl,
        query,
        params,
        body: this.filterSensitiveData(body),
        headers: this.filterSensitiveHeaders(headers),
        client: {
          ip,
          user_agent: userAgent,
          referer,
        },
        user: {
          id: userId,
          email: userEmail,
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'api',
        host: headers.host,
      };

      this.logger.info('HTTP Request', {
        ...requestLog,
        context: 'HTTP',
      });
    } catch (e) {
      console.error('Failed to log request:', e);
    }

    // 응답 바디 캡처를 위한 원본 함수들 저장
    const originalWrite = response.write.bind(response);
    const originalEnd = response.end.bind(response);
    const chunks: Buffer[] = [];
    let chunkLength = 0;
    const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB 제한

    // @ts-expect-error: Express 타입과 Node.js 스트림 타입 간의 불일치 해결
    response.write = function (
      chunk: any,
      encoding?: string,
      callback?: (error?: Error) => void,
    ) {
      if (chunk) {
        const buffer = Buffer.from(chunk);
        chunkLength += buffer.length;
        if (chunkLength <= MAX_RESPONSE_SIZE) {
          chunks.push(buffer);
        }
      }
      return originalWrite(chunk, encoding, callback);
    };

    // @ts-expect-error: Express 타입과 Node.js 스트림 타입 간의 불일치 해결
    response.end = function (
      chunk?: any,
      encoding?: string,
      callback?: () => void,
    ) {
      if (chunk) {
        const buffer = Buffer.from(chunk);
        chunkLength += buffer.length;
        if (chunkLength <= MAX_RESPONSE_SIZE) {
          chunks.push(buffer);
        }
      }
      return originalEnd(chunk, encoding, callback);
    };

    // 응답 로깅
    response.on('finish', () => {
      try {
        const { statusCode } = response;
        const responseTime = Date.now() - startTime;

        // 응답 바디 파싱 (JSON인 경우만)
        let responseBody;
        try {
          if (chunks.length > 0) {
            if (chunkLength > MAX_RESPONSE_SIZE) {
              responseBody = `Response too large (${chunkLength} bytes)`;
            } else {
              const body = Buffer.concat(chunks).toString('utf8');
              const contentType = response.getHeader('content-type');
              if (contentType?.toString().includes('application/json')) {
                try {
                  responseBody = JSON.parse(body);
                } catch (e) {
                  responseBody =
                    body.length > 1000 ? body.substring(0, 1000) + '...' : body;
                }
              } else {
                responseBody = 'Non-JSON response';
              }
            }
          }
        } catch (e) {
          responseBody = 'Error parsing response body';
          this.logger.warn('Response body parsing failed', {
            error: e.message,
          });
        }

        const contentLength = response.getHeader('content-length');
        const contentType = response.getHeader('content-type');

        const responseLog = {
          type: 'RESPONSE',
          method,
          path: pathWithoutQuery,
          full_url: originalUrl,
          statusCode,
          responseTime,
          response_size: contentLength,
          content_type: contentType,
          response_body: this.filterSensitiveData(responseBody),
          client: {
            ip,
            user_agent: userAgent,
            referer,
          },
          user: {
            id: userId,
            email: userEmail,
          },
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          service: 'api',
          host: headers.host,
        };

        if (statusCode >= 400) {
          this.logger.error('HTTP Response Error', {
            ...responseLog,
            context: 'HTTP',
            error_type: this.getErrorType(statusCode),
          });
        } else {
          this.logger.info('HTTP Response Success', {
            ...responseLog,
            context: 'HTTP',
          });
        }
      } catch (e) {
        console.error('Failed to log response:', e);
      }
    });

    next();
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'unknown_error';
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
