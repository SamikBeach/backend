import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthorModule } from '../author/author.module';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@entities/User';

@Module({
  imports: [ConfigModule, AuthorModule, TypeOrmModule.forFeature([User])],
  controllers: [AiController],
  providers: [AiService, JwtService],
  exports: [AiService],
})
export class AiModule {}
