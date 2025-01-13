import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '통합 검색 API' })
  @ApiQuery({ name: 'keyword', required: true, description: '검색 키워드' })
  @ApiResponse({ status: 200, description: '검색 결과 반환' })
  async search(@Query('keyword') keyword: string) {
    return this.searchService.search(keyword);
  }
}
