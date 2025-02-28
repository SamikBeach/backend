import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
} from '@nestjs/common';
import { YouTubeService } from './youtube.service';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('youtube')
export class YouTubeController {
  constructor(private readonly youtubeService: YouTubeService) {}

  /**
   * 검색어로 YouTube 동영상을 검색합니다.
   * 결과는 1시간 동안 캐싱됩니다.
   */
  @Get('search')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('youtube_search')
  @CacheTTL(3600) // 1시간 캐싱
  async searchVideos(
    @Query('query') query: string,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
  ) {
    // 동적 캐시 키 생성
    const cacheKey = `youtube_search_${query}_${maxResults}`;
    Reflect.defineMetadata('cache_key', cacheKey, this.searchVideos);

    console.log(
      `[YouTube API] 검색어: ${query}, 최대 결과 수: ${maxResults}에 대한 동영상 검색`,
    );
    return this.youtubeService.searchVideos(query, maxResults);
  }

  /**
   * 작가 이름으로 YouTube 동영상을 검색합니다.
   * 결과는 1시간 동안 캐싱됩니다.
   */
  @Get('author')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('youtube_author')
  @CacheTTL(3600) // 1시간 캐싱
  async searchAuthorVideos(
    @Query('name') authorName: string,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
  ) {
    // 동적 캐시 키 생성
    const cacheKey = `youtube_author_${authorName}_${maxResults}`;
    Reflect.defineMetadata('cache_key', cacheKey, this.searchAuthorVideos);

    console.log(
      `[YouTube API] 저자 이름: ${authorName}, 최대 결과 수: ${maxResults}에 대한 동영상 검색`,
    );
    return this.youtubeService.searchAuthorVideos({
      authorName,
      maxResults,
    });
  }

  /**
   * 책 제목으로 YouTube 동영상을 검색합니다.
   * 결과는 1시간 동안 캐싱됩니다.
   */
  @Get('book')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('youtube_book')
  @CacheTTL(3600) // 1시간 캐싱
  async searchBookVideos(
    @Query('title') bookTitle: string,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
    @Query('author') authorName?: string,
  ) {
    // 동적 캐시 키 생성
    const cacheKey = `youtube_book_${bookTitle}_${authorName || '없음'}_${maxResults}`;
    Reflect.defineMetadata('cache_key', cacheKey, this.searchBookVideos);

    console.log(
      `[YouTube API] 책 제목: ${bookTitle}, 저자 이름: ${authorName || '없음'}, 최대 결과 수: ${maxResults}에 대한 동영상 검색`,
    );
    return this.youtubeService.searchBookVideos({
      bookTitle,
      maxResults,
      authorName,
    });
  }
}
