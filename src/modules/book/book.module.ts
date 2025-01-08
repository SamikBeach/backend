import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '@entities/Book';
import { UserBookLike } from '@entities/UserBookLike';
import { Review } from '@entities/Review';
import { JwtService } from '@nestjs/jwt';
import { User } from '@entities/User';

@Module({
  imports: [TypeOrmModule.forFeature([Book, UserBookLike, Review, User])],
  controllers: [BookController],
  providers: [BookService, JwtService],
  exports: [BookService],
})
export class BookModule {}
