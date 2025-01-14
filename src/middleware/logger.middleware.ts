import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl } = request;

    response.on('finish', () => {
      const { statusCode } = response;
      const coloredMethod = this.getMethodColor(method);
      const coloredPath = `\x1b[35m${originalUrl}\x1b[0m`; // magenta for path
      const coloredStatus = this.getStatusColor(statusCode);

      this.logger.log(`${coloredMethod} ${coloredPath} | ${coloredStatus}`);
    });

    next();
  }

  private getMethodColor(method: string): string {
    const colors = {
      GET: '\x1b[32m', // green
      POST: '\x1b[33m', // yellow
      PUT: '\x1b[34m', // blue
      PATCH: '\x1b[36m', // cyan
      DELETE: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    return `${colors[method] || '\x1b[37m'}${method}${reset}`;
  }

  private getStatusColor(status: number): string {
    const colors = {
      2: '\x1b[32m', // green for 2xx
      3: '\x1b[36m', // cyan for 3xx
      4: '\x1b[33m', // yellow for 4xx
      5: '\x1b[31m', // red for 5xx
    };
    const reset = '\x1b[0m';
    const colorCode = colors[Math.floor(status / 100)] || '\x1b[37m';
    return `${colorCode}${status}${reset}`;
  }
}
