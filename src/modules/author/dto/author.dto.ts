import { Author } from '@entities/Author';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
}

export interface AuthorDetailResponse extends Author {
  bookCount: number;
  description: string | null;
  isLiked?: boolean;
  influencedBy?: Array<{
    id: number;
    name: string;
    nameInKor: string;
  }>;
  influenced?: Array<{
    id: number;
    name: string;
    nameInKor: string;
  }>;
}
