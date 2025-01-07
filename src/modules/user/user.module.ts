import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '@entities/User';
import { JwtModule } from '@nestjs/jwt';
import { UserBook } from '@entities/UserBook';
import { UserAuthor } from '@entities/UserAuthor';
import { Review } from '@entities/Review';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserBook, UserAuthor, Review]),
    JwtModule.register({}),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
