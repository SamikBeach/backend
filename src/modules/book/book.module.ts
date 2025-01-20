import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '@entities/Book';
import { UserBookLike } from '@entities/UserBookLike';
import { Review } from '@entities/Review';
import { JwtService } from '@nestjs/jwt';
import { User } from '@entities/User';
import { UserReviewLike } from '@entities/UserReviewLike';
import { UserCommentLike } from '@entities/UserCommentLike';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      UserBookLike,
      Review,
      User,
      UserReviewLike,
    ]),
  ],
  controllers: [BookController],
  providers: [BookService, JwtService],
  exports: [BookService],
})
export class BookModule {}
