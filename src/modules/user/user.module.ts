import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@entities/User';
import { UserBookLike } from '@entities/UserBookLike';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Review } from '@entities/Review';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserSearch } from '@entities/UserSearch';
import { FileModule } from '../file/file.module';
import { UserBlock } from '@entities/UserBlock';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserBookLike,
      UserAuthorLike,
      Review,
      UserSearch,
      UserBlock,
    ]),
    FileModule,
  ],
  controllers: [UserController],
  providers: [UserService, JwtService, ConfigService],
  exports: [UserService],
})
export class UserModule {}
