import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Era } from '@entities/Era';

@Injectable()
export class EraService {
  constructor(
    @InjectRepository(Era)
    private readonly eraRepository: Repository<Era>,
  ) {}

  /**
   * 모든 시대 목록을 조회합니다.
   */
  async findAll(): Promise<Era[]> {
    return this.eraRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }
}
