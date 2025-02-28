import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@entities/User';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  controllers: [],
  providers: [AiService, JwtService],
  exports: [AiService],
})
export class AiModule {}
