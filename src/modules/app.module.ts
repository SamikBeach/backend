import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from '@entities/User';
import { Author } from '@entities/Author';
import { Book } from '@entities/Book';
import { UserBookLike } from '@entities/UserBookLike';
import { AuthorBook } from '@entities/AuthorBook';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Comment } from '@entities/Comment';
import { Review } from '@entities/Review';
import { UserModule } from './user/user.module';
import { BookModule } from './book/book.module';
import { AuthorModule } from './author/author.module';
import { ReviewModule } from './review/review.module';
import { UserCommentLike } from '@entities/UserCommentLike';
import { UserReviewLike } from '@entities/UserReviewLike';
import { SearchModule } from './search/search.module';
import { UserSearch } from '@entities/UserSearch';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import { LoggerMiddleware } from '../middleware/logger.middleware';
import { OriginalWork } from '@entities/OriginalWork';
import { AuthorOriginalWork } from '@entities/AuthorOriginalWork';
import { BookOriginalWork } from '@entities/BookOriginalWork';
import { Era } from '@entities/Era';
import { Genre } from '@entities/Genre';
import { PrometheusModule } from './prometheus/prometheus.module';
import { EraModule } from './era/era.module';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { ReviewReport } from '@entities/ReviewReport';
import { UserBlock } from '@entities/UserBlock';
import { YouTubeModule } from './youtube/youtube.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheConfigService } from '@config/cache.config';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfigService,
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.colorize({
              colors: {
                info: 'cyan',
                error: 'red',
                warn: 'yellow',
                http: 'magenta',
                debug: 'green',
              },
            }),
            winston.format.printf(
              ({ level, message, timestamp, ...metadata }: any) => {
                const { request, response } = metadata;
                if (request && response) {
                  const method = `\x1b[36m${request.method}\x1b[0m`;
                  const path = `\x1b[33m${request.path}\x1b[0m`;
                  const query =
                    Object.keys(request.query || {}).length > 0
                      ? `\x1b[90m${JSON.stringify(request.query)}\x1b[0m`
                      : '';
                  const status = `\x1b[${response.statusCode < 400 ? '32' : '31'}m${response.statusCode}\x1b[0m`;
                  const time = `\x1b[35m${response.responseTime}ms\x1b[0m`;

                  return `[${timestamp}] ${level} » ${method} ${path}${query ? ' ' + query : ''} | ${status} ${time}`;
                }
                return `[${timestamp}] ${level} » ${message}`;
              },
            ),
          ),
        }),
        // info 레벨 로그 파일
        new DailyRotateFile({
          level: 'info',
          dirname: path.join(__dirname, '../..', 'logs', 'info'),
          filename: 'application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }) as winston.transport,
        // error 레벨 로그 파일
        new DailyRotateFile({
          level: 'error',
          dirname: path.join(__dirname, '../..', 'logs', 'error'),
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }) as winston.transport,
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        Author,
        Book,
        AuthorBook,
        User,
        UserBookLike,
        UserAuthorLike,
        Comment,
        Review,
        UserCommentLike,
        UserReviewLike,
        UserSearch,
        OriginalWork,
        AuthorOriginalWork,
        BookOriginalWork,
        Era,
        Genre,
        ReviewReport,
        UserBlock,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UserModule,
    BookModule,
    AuthorModule,
    ReviewModule,
    SearchModule,
    PrometheusModule,
    EraModule,
    YouTubeModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
