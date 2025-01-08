import { Module } from '@nestjs/common';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from '@entities/Author';
import { UserAuthor } from '@entities/UserAuthor';
import { Book } from '@entities/Book';
import { JwtService } from '@nestjs/jwt';
import { User } from '@entities/User';

@Module({
  imports: [TypeOrmModule.forFeature([Author, UserAuthor, Book, User])],
  controllers: [AuthorController],
  providers: [AuthorService, JwtService],
  exports: [AuthorService],
})
export class AuthorModule {}
