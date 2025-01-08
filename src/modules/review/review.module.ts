import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '@entities/Review';
import { Comment } from '@entities/Comment';
import { Book } from '@entities/Book';
import { CommentLike } from '@entities/CommentLike';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Comment, Book, CommentLike])],
  controllers: [ReviewController],
  providers: [ReviewService, JwtService],
  exports: [ReviewService],
})
export class ReviewModule {}
