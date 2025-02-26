import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { YouTubeService } from './youtube.service';

@Controller('youtube')
export class YouTubeController {
  constructor(private readonly youtubeService: YouTubeService) {}

  /**
   * 검색어로 YouTube 동영상을 검색합니다.
   */
  @Get('search')
  async searchVideos(
    @Query('query') query: string,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
  ) {
    return this.youtubeService.searchVideos(query, maxResults);
  }

  /**
   * 작가 이름으로 YouTube 동영상을 검색합니다.
   */
  @Get('author')
  async searchAuthorVideos(
    @Query('name') authorName: string,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
  ) {
    return this.youtubeService.searchAuthorVideos({
      authorName,
      maxResults,
    });
  }

  /**
   * 책 제목으로 YouTube 동영상을 검색합니다.
   */
  @Get('book')
  async searchBookVideos(
    @Query('title') bookTitle: string,
    @Query('maxResults', new DefaultValuePipe(5), ParseIntPipe)
    maxResults: number,
    @Query('author') authorName?: string,
  ) {
    return this.youtubeService.searchBookVideos({
      bookTitle,
      maxResults,
      authorName,
    });
  }
}
