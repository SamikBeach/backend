import { Controller, Get } from '@nestjs/common';
import { EraService } from './era.service';
import { Era } from '@entities/Era';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Era')
@Controller('era')
export class EraController {
  constructor(private readonly eraService: EraService) {}

  /**
   * 모든 시대 목록을 조회합니다.
   */
  @Get()
  @ApiOperation({
    summary: '시대 목록 조회',
    description: '모든 시대 목록을 조회합니다.',
  })
  async findAll(): Promise<Era[]> {
    return this.eraService.findAll();
  }
}
