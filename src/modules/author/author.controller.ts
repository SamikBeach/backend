import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
  UseInterceptors,
} from '@nestjs/common';
import { AuthorService } from './author.service';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { User } from '@entities/User';
import { OptionalJwtAuthGuard } from '@guards/optional-jwt-auth.guard';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('author')
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  /**
   * 모든 저자 목록을 가져옵니다.
   * 이름 오름차순으로 정렬됩니다.
   */
  @Get()
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAllAuthors() {
    return this.authorService.getAllAuthors();
  }

  /**
   * 저자 목록을 조회하고 검색합니다.
   * 페이지네이션, 정렬, 검색, 필터링을 지원합니다.
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(1800) // 30분
  async searchAuthors(
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.authorService.searchAuthors(query, user?.id);
  }

  /**
   * 저자 상세 정보를 조회합니다.
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAuthorDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
  ) {
    return this.authorService.findById(id, user?.id);
  }

  /**
   * 저자 관련 YouTube 동영상을 검색합니다.
   * 결과는 1시간 동안 캐싱됩니다.
   */
  @Get(':id/videos')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('author_videos')
  @CacheTTL(3600) // 1시간 캐싱
  async getAuthorVideos(
    @Param('id', ParseIntPipe) id: number,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
  ) {
    // 동적 캐시 키 생성
    const cacheKey = `author_videos_${id}_${maxResults}`;
    Reflect.defineMetadata('cache_key', cacheKey, this.getAuthorVideos);

    console.log(
      `[YouTube API] 저자 ID: ${id}, 최대 결과 수: ${maxResults}에 대한 동영상 검색`,
    );
    return this.authorService.getAuthorVideos(id, maxResults);
  }

  /**
   * 저자 좋아요를 추가하거나 취소합니다.
   * 인증이 필요한 작업입니다.
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @Param('id', ParseIntPipe) authorId: number,
    @CurrentUser() user: User,
  ) {
    return this.authorService.toggleLike(user.id, authorId);
  }

  /**
   * 저자가 쓴 모든 책 목록을 조회합니다.
   */
  @Get(':id/books')
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAllAuthorBooks(@Param('id', ParseIntPipe) id: number) {
    return this.authorService.getAllAuthorBooks(id);
  }

  /**
   * 저자의 리뷰 목록을 조회합니다.
   * 페이지네이션을 지원합니다.
   */
  @Get(':id/reviews')
  @UseGuards(OptionalJwtAuthGuard)
  async getAuthorReviews(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.authorService.getAuthorReviews(id, query, user?.id);
  }

  /**
   * 저자의 모든 원작 목록을 조회합니다.
   */
  @Get(':id/original-works')
  async getAuthorOriginalWorks(@Param('id', ParseIntPipe) id: number) {
    return this.authorService.getAuthorOriginalWorks(id);
  }

  /**
   * 저자에게 영향을 받은 저자 목록을 조회합니다.
   */
  @Get(':id/influenced')
  async getInfluencedAuthors(@Param('id', ParseIntPipe) id: number) {
    const author = await this.authorService.findAuthorBasicInfo(id);
    return this.authorService.getInfluencedAuthors(author.nameInKor);
  }

  /**
   * 저자에게 영향을 준 저자 목록을 조회합니다.
   */
  @Get(':id/influenced-by')
  async getInfluencedByAuthors(@Param('id', ParseIntPipe) id: number) {
    const author = await this.authorService.findAuthorBasicInfo(id);
    return this.authorService.getInfluencedByAuthors(author.nameInKor);
  }
}
