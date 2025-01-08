import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '@entities/Review';
import { Comment } from '@entities/Comment';
import { Book } from '@entities/Book';
import { UserReviewLike } from '@entities/UserReviewLike';
import { UserCommentLike } from '@entities/UserCommentLike';
import { JwtService } from '@nestjs/jwt';
import { User } from '@entities/User';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      Comment,
      Book,
      UserReviewLike,
      UserCommentLike,
      User,
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService, JwtService],
  exports: [ReviewService],
})
export class ReviewModule {}
