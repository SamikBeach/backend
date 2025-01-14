import { Module } from '@nestjs/common';
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
        UserBookLike,
        UserAuthorLike,
        Comment,
        Review,
        UserCommentLike,
        UserReviewLike,
        UserSearch,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UserModule,
    BookModule,
    AuthorModule,
    ReviewModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
