import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from '@entities/User';
import { Author } from '@entities/Author';
import { Book } from '@entities/Book';
import { UserBook } from '@entities/UserBook';
import { AuthorBook } from '@entities/AuthorBook';
import { UserAuthor } from '@entities/UserAuthor';
import { Comment } from '@entities/Comment';
import { Review } from '@entities/Review';
import { UserModule } from './user/user.module';
import { BookModule } from './book/book.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
      isGlobal: true,
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
        UserBook,
        UserAuthor,
        Comment,
        Review,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UserModule,
    BookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
