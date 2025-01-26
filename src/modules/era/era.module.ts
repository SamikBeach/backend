import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Era } from '@entities/Era';
import { EraController } from './era.controller';
import { EraService } from './era.service';

@Module({
  imports: [TypeOrmModule.forFeature([Era])],
  controllers: [EraController],
  providers: [EraService],
  exports: [EraService],
})
export class EraModule {}
