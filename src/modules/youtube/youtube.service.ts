import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';

@Injectable()
export class YouTubeService {
  private readonly youtube: youtube_v3.Youtube;
  private readonly logger = new Logger(YouTubeService.name);

  constructor(private readonly configService: ConfigService) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.configService.get<string>('YOUTUBE_API_KEY'),
    });
  }

  /**
   * 검색어로 YouTube 동영상을 검색합니다.
   * @param query 검색어
   * @param maxResults 최대 결과 수 (기본값: 5)
   * @returns YouTube 검색 결과
   */
  async searchVideos(query: string, maxResults: number = 5) {
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

      return (
        response.data.items?.map((item) => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          description: item.snippet?.description,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
          publishedAt: item.snippet?.publishedAt,
          channelTitle: item.snippet?.channelTitle,
        })) || []
      );
    } catch (error) {
      this.logger.error(
        `YouTube 검색 중 오류 발생: ${error.message}`,
        error.stack,
      );
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
  }) {
    const { authorName, maxResults = 5 } = options;
    const query = `${authorName} 작가 강연 인터뷰`;
    return this.searchVideos(query, maxResults);
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
  }) {
    const { bookTitle, authorName, maxResults = 5 } = options;
    let query = `${bookTitle}`;

    if (authorName) {
      query += ` ${authorName}`;
    }

    return this.searchVideos(query, maxResults);
  }
}
