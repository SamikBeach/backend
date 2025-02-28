import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// YouTube 비디오 결과 타입 정의
export interface YouTubeVideoResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
}

@Injectable()
export class YouTubeService {
  private readonly youtube: youtube_v3.Youtube;
  private readonly logger = new Logger(YouTubeService.name);
  private readonly cacheTTL = 86400; // 24시간 (초 단위)

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * 검색어로 YouTube 동영상을 검색합니다.
   * 캐시에 데이터가 있으면 캐시에서 반환하고, 없으면 API를 호출하여 캐시에 저장합니다.
   * @param query 검색어
   * @param maxResults 최대 결과 수 (기본값: 5)
   * @returns YouTube 검색 결과
   */
  async searchVideos(
    query: string,
    maxResults: number = 5,
  ): Promise<YouTubeVideoResult[]> {
    const cacheKey = `youtube_search_${query}_${maxResults}`;

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 YouTube 검색 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 캐시에 데이터가 없으면 API 호출
    this.logger.log(`YouTube API 호출: ${query}`);
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'],
        relevanceLanguage: 'ko',
        videoEmbeddable: 'true',
        safeSearch: 'moderate',
      });

      const results: YouTubeVideoResult[] =
        response.data.items?.map((item) => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          description: item.snippet?.description,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
          publishedAt: item.snippet?.publishedAt,
          channelTitle: item.snippet?.channelTitle,
        })) || [];

      // 결과를 캐시에 저장 (빈 결과는 저장하지 않음)
      if (results.length > 0) {
        await this.cacheManager.set(cacheKey, results, this.cacheTTL);
      }

      return results;
    } catch (error) {
      this.logger.error('YouTube API 오류:', error.message);

      // 할당량 초과 여부 확인
      if (
        error.code === 403 ||
        (error.response && error.response.status === 403)
      ) {
        this.logger.error('YouTube API 할당량 초과 가능성:', {
          code: error.code,
          status: error.response?.status,
          reason: error.response?.data?.error?.errors?.[0]?.reason,
        });
      }

      return [];
    }
  }

  /**
   * 작가 이름으로 YouTube 동영상을 검색합니다.
   * @param options 검색 옵션
   * @param options.authorName 작가 이름
   * @param options.maxResults 최대 결과 수 (기본값: 5)
   * @returns YouTube 검색 결과
   */
  async searchAuthorVideos(options: {
    authorName: string;
    maxResults?: number;
  }): Promise<YouTubeVideoResult[]> {
    const { authorName, maxResults = 5 } = options;
    const cacheKey = `youtube_author_${authorName}_${maxResults}`;

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 작가 동영상 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 캐시에 데이터가 없으면 검색 실행YouTube API 호출
    this.logger.log(`작가 : ${authorName}`);
    const query = `${authorName}`;
    const results = await this.searchVideos(query, maxResults);

    // 결과를 캐시에 저장 (빈 결과는 저장하지 않음)
    if (results.length > 0) {
      await this.cacheManager.set(cacheKey, results, this.cacheTTL);
    }

    return results;
  }

  /**
   * 책 제목으로 YouTube 동영상을 검색합니다.
   * @param options 검색 옵션
   * @param options.bookTitle 책 제목
   * @param options.maxResults 최대 결과 수 (기본값: 5)
   * @param options.authorName 작가 이름 (선택적)
   * @returns YouTube 검색 결과
   */
  async searchBookVideos(options: {
    bookTitle: string;
    maxResults?: number;
    authorName?: string;
  }): Promise<YouTubeVideoResult[]> {
    const { bookTitle, authorName, maxResults = 5 } = options;
    const cacheKey = `youtube_book_${bookTitle}_${authorName || '없음'}_${maxResults}`;

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 책 동영상 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 캐시에 데이터가 없으면 검색 실행
    this.logger.log(`책 YouTube API 호출: ${bookTitle}`);
    let query = `${bookTitle}`;
    if (authorName) {
      query += ` ${authorName}`;
    }

    const results = await this.searchVideos(query, maxResults);

    // 결과를 캐시에 저장 (빈 결과는 저장하지 않음)
    if (results.length > 0) {
      await this.cacheManager.set(cacheKey, results, this.cacheTTL);
    }

    return results;
  }
}
