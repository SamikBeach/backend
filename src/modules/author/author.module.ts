import { Module } from '@nestjs/common';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from '@entities/Author';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Book } from '@entities/Book';
import { JwtService } from '@nestjs/jwt';
import { User } from '@entities/User';
import { Review } from '@entities/Review';
import { UserReviewLike } from '@entities/UserReviewLike';
import { YouTubeService } from '@modules/youtube/youtube.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Author,
      UserAuthorLike,
      Book,
      User,
      Review,
      UserReviewLike,
    ]),
  ],
  controllers: [AuthorController],
  providers: [AuthorService, JwtService, YouTubeService],
  exports: [AuthorService],
})
export class AuthorModule {}
