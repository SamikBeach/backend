import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not, Brackets } from 'typeorm';
import { Book } from '@entities/Book';
import { UserBookLike } from '@entities/UserBookLike';
import { Review } from '@entities/Review';
import { UserReviewLike } from '@entities/UserReviewLike';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { addKoreanSearchCondition } from '@utils/search';
import { YouTubeService } from '../youtube/youtube.service';
import { AiService } from '../ai/ai.service';
import { ConversationMessageDto } from '@modules/ai/dto/chat.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

// 알라딘 API 응답 인터페이스
interface AladinResponse {
  item?: Array<{
    title: string;
    author: string;
    publisher: string;
    pubDate: string;
    description: string;
    isbn: string;
    isbn13: string;
    cover: string;
    categoryName: string;
    itemPage: number;
  }>;
  errorCode?: number;
  errorMessage?: string;
}

@Injectable()
export class BookService {
  private readonly aladinApiUrl =
    'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(UserBookLike)
    private readonly userBookLikeRepository: Repository<UserBookLike>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(UserReviewLike)
    private readonly userReviewLikeRepository: Repository<UserReviewLike>,
    private readonly dataSource: DataSource,
    private readonly youtubeService: YouTubeService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * ID로 책을 찾습니다.
   */
  async findById(
    id: number,
    userId?: number,
    includeOtherTranslations = false,
  ) {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: [
        'authorBooks.author',
        'bookOriginalWorks.originalWork',
        'bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    // 자신을 포함한 모든 번역서 개수를 계산합니다
    const totalTranslationCount = new Set(
      book.bookOriginalWorks.flatMap((bow) =>
        bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
      ),
    ).size;

    let reviewCount = book.reviewCount;

    // includeOtherTranslations가 true이고 원전이 있는 경우
    if (includeOtherTranslations && book.bookOriginalWorks?.length > 0) {
      const originalWorkId = book.bookOriginalWorks[0].originalWork.id;

      // 같은 원전을 가진 모든 책의 리뷰 수를 합산
      const relatedBooks = await this.bookRepository
        .createQueryBuilder('book')
        .innerJoin('book.bookOriginalWorks', 'bow')
        .where('bow.originalWorkId = :originalWorkId', { originalWorkId })
        .getMany();

      reviewCount = relatedBooks.reduce(
        (sum, book) => sum + book.reviewCount,
        0,
      );
    }

    // 알라딘 API에서 책 정보 가져오기
    let description = null;
    if (book.isbn13) {
      const aladinInfo = await this.getBookAladinInfo(book.isbn13);
      description = aladinInfo?.description;
    }

    const response = {
      ...book,
      totalTranslationCount,
      reviewCount,
      description,
    };

    if (userId) {
      const userLike = await this.userBookLikeRepository.findOne({
        where: { userId, bookId: id },
      });

      return {
        ...response,
        isLiked: !!userLike,
      };
    }

    return response;
  }

  /**
   * 책을 검색하고 페이지네이션된 결과를 반환합니다.
   */
  async searchBooks(query: PaginateQuery, userId?: number) {
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.authorBooks', 'authorBooks')
      .leftJoinAndSelect('authorBooks.author', 'author')
      .leftJoinAndSelect('book.bookOriginalWorks', 'bookOriginalWorks')
      .leftJoinAndSelect('bookOriginalWorks.originalWork', 'originalWork')
      .leftJoinAndSelect('originalWork.bookOriginalWorks', 'originalWorkBooks')
      .leftJoinAndSelect('originalWorkBooks.book', 'relatedBook');

    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          addKoreanSearchCondition(qb, 'book.title', query.search, 'bookTitle');
          addKoreanSearchCondition(
            qb,
            'author.nameInKor',
            query.search,
            'authorName',
          );
          qb.orWhere('book.isbn = :isbn', { isbn: query.search }).orWhere(
            'book.isbn13 = :isbn13',
            { isbn13: query.search },
          );
        }),
      );
    }

    if (query.filter?.authorId) {
      queryBuilder.andWhere('authorBooks.authorId = :authorId', {
        authorId: Number(query.filter.authorId),
      });
    }

    // likeCount DESC 정렬일 때 publicationDate DESC를 보조 정렬로 추가
    if (
      query.sortBy?.[0]?.[0] === 'likeCount' &&
      query.sortBy?.[0]?.[1] === 'DESC'
    ) {
      queryBuilder.orderBy('book.likeCount', 'DESC');
      queryBuilder.addOrderBy('book.publicationDate', 'DESC');
    }

    const books = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'title',
        'publisher',
        'publicationDate',
        'likeCount',
        'reviewCount',
      ],
      defaultSortBy: [['id', 'DESC']],
      maxLimit: 100,
    });

    // 각 책에 대해 전체 번역서 개수 추가
    books.data = books.data.map((book) => {
      const totalTranslationCount = new Set(
        (book.bookOriginalWorks || []).flatMap((bow) =>
          (bow?.originalWork?.bookOriginalWorks || [])
            .map((obow) => obow?.book?.id)
            .filter(Boolean),
        ),
      ).size;

      return {
        ...book,
        totalTranslationCount,
      };
    });

    if (userId) {
      const userLikes = await this.userBookLikeRepository.find({
        where: {
          userId,
          bookId: In(books.data.map((book) => book.id)),
        },
      });

      const likedBookIds = new Set(userLikes.map((like) => like.bookId));

      books.data = books.data.map((book) => ({
        ...book,
        isLiked: likedBookIds.has(book.id),
      }));
    }

    return books;
  }
  /**
   * 책 좋아요를 토글합니다.
   */
  async toggleLike(userId: number, bookId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const book = await queryRunner.manager.findOne(Book, {
        where: { id: bookId },
      });

      if (!book) {
        throw new NotFoundException('책을 찾을 수 없습니다.');
      }

      const existingLike = await queryRunner.manager.findOne(UserBookLike, {
        where: { userId, bookId },
      });

      if (existingLike) {
        await queryRunner.manager.remove(UserBookLike, existingLike);
        // likeCount 감소
        await queryRunner.manager.decrement(
          Book,
          { id: bookId },
          'likeCount',
          1,
        );
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserBookLike, {
          userId,
          bookId,
        });
        // likeCount 증가
        await queryRunner.manager.increment(
          Book,
          { id: bookId },
          'likeCount',
          1,
        );
        await queryRunner.commitTransaction();
        return { liked: true };
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 연관된 책 목록(같은 원전의 다른 번역서들)을 조회합니다.
   */
  async searchRelatedBooks(bookId: number, query: PaginateQuery) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['bookOriginalWorks.originalWork'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const originalWorkIds = book.bookOriginalWorks.map(
      (bow) => bow.originalWork.id,
    );

    // 원전이 없는 경우 빈 결과 반환
    if (originalWorkIds.length === 0) {
      return {
        data: [],
        meta: {
          itemsPerPage: query.limit || 10,
          totalItems: 0,
          currentPage: query.page || 1,
          totalPages: 0,
        },
      };
    }

    // 서브쿼리를 사용하여 같은 원전을 하나라도 공유하는 책들을 찾습니다
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .innerJoinAndSelect('book.bookOriginalWorks', 'bow')
      .innerJoinAndSelect('bow.originalWork', 'originalWork')
      .innerJoinAndSelect('book.authorBooks', 'ab')
      .innerJoinAndSelect('ab.author', 'author')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('DISTINCT bow2.book_id')
          .from('book_original_work', 'bow2')
          .where('bow2.original_work_id IN (:...originalWorkIds)', {
            originalWorkIds,
          })
          .getQuery();
        return 'book.id IN ' + subQuery;
      })
      .andWhere('book.id != :bookId', { bookId });

    const paginatedBooks = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'title',
        'publicationDate',
        'likeCount',
        'reviewCount',
      ],
      defaultSortBy: [['publicationDate', 'DESC']],
      maxLimit: 20,
    });

    // 각 책에 대해 전체 번역서 개수 추가
    paginatedBooks.data = await Promise.all(
      paginatedBooks.data.map(async (book) => {
        const bookWithRelations = await this.bookRepository.findOne({
          where: { id: book.id },
          relations: [
            'bookOriginalWorks.originalWork',
            'bookOriginalWorks.originalWork.bookOriginalWorks.book',
          ],
        });

        const totalTranslationCount = new Set(
          bookWithRelations.bookOriginalWorks.flatMap((bow) =>
            bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
          ),
        ).size;

        return {
          ...book,
          totalTranslationCount,
        };
      }),
    );

    return paginatedBooks;
  }

  /**
   * 연관된 모든 책 목록(같은 원전의 다른 번역서들)을 조회합니다.
   * 페이지네이션 없이 전체 목록을 반환합니다.
   */
  async getAllRelatedBooks(bookId: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['bookOriginalWorks.originalWork'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const originalWorkIds = book.bookOriginalWorks.map(
      (bow) => bow.originalWork.id,
    );

    // 원전이 없는 경우 빈 배열 반환
    if (originalWorkIds.length === 0) {
      return [];
    }

    const relatedBooks = await this.bookRepository.find({
      where: {
        id: Not(bookId),
        bookOriginalWorks: {
          originalWork: {
            id: In(originalWorkIds),
          },
        },
      },
      relations: [
        'authorBooks.author',
        'bookOriginalWorks.originalWork',
        'bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
      order: {
        publicationDate: 'DESC', // 최신순 정렬
      },
    });

    // 각 책에 대해 전체 번역서 개수 추가
    return relatedBooks.map((book) => {
      const totalTranslationCount = new Set(
        book.bookOriginalWorks.flatMap((bow) =>
          bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
        ),
      ).size;

      return {
        ...book,
        totalTranslationCount,
      };
    });
  }

  /**
   * 책의 리뷰 목록을 조회합니다.
   */
  async getBookReviews(
    bookId: number,
    query: PaginateQuery,
    userId?: number,
    includeOtherTranslations = false,
  ) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['bookOriginalWorks', 'bookOriginalWorks.originalWork'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    let whereCondition: any = { bookId };

    if (includeOtherTranslations && book.bookOriginalWorks?.length > 0) {
      const originalWorkId = book.bookOriginalWorks[0].originalWork.id;

      const relatedBooks = await this.bookRepository
        .createQueryBuilder('book')
        .innerJoin('book.bookOriginalWorks', 'bow')
        .where('bow.originalWorkId = :originalWorkId', { originalWorkId })
        .select(['book.id'])
        .getMany();

      whereCondition = {
        bookId: In(relatedBooks.map((book) => book.id)),
      };
    }

    const reviews = await paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      where: whereCondition,
      relations: ['user', 'book', 'book.authorBooks.author'],
    });

    if (userId) {
      const userLikes = await this.userReviewLikeRepository.find({
        where: {
          userId,
          reviewId: In(reviews.data.map((review) => review.id)),
        },
      });

      const likedReviewIds = new Set(userLikes.map((like) => like.reviewId));

      reviews.data = reviews.data.map((review) => ({
        ...review,
        isLiked: likedReviewIds.has(review.id),
      }));
    }

    return reviews;
  }

  /**
   * 책 관련 YouTube 동영상을 검색합니다.
   */
  async getBookVideos(bookId: number, maxResults: number = 5) {
    const book = await this.findById(bookId);

    // 작가 이름 추출 (첫 번째 작가만 사용)
    const authorName = book.authorBooks?.[0]?.author?.nameInKor || '';

    return this.youtubeService.searchBookVideos({
      bookTitle: book.title,
      maxResults,
      authorName,
    });
  }

  /**
   * 알라딘 API에서 책 정보를 가져옵니다.
   * @param isbn13 ISBN13 코드
   * @returns 알라딘에서 가져온 책 설명
   */
  private async getBookAladinInfo(isbn13: string) {
    try {
      const aladinApiKey = this.configService.get<string>('ALADIN_API_KEY');

      if (!aladinApiKey) {
        console.error('알라딘 API 키가 설정되지 않았습니다.');
        return { description: null };
      }

      // URL을 직접 구성하여 로깅
      const url = `${this.aladinApiUrl}?ttbkey=${aladinApiKey}&itemIdType=ISBN&ItemId=${isbn13}&output=js&Version=20131101&OptResult=ebookList,usedList,reviewList`;

      const response = await axios.get<AladinResponse>(url);

      // 에러 코드 확인
      if (response.data.errorCode) {
        console.error(
          `알라딘 API 오류: 코드=${response.data.errorCode}, 메시지=${response.data.errorMessage}`,
        );
        return { description: null };
      }

      if (response.data.item && response.data.item.length > 0) {
        const bookInfo = response.data.item[0];
        const result = {
          description: bookInfo.description || null,
          author: bookInfo.author || null,
          publisher: bookInfo.publisher || null,
          pubDate: bookInfo.pubDate || null,
          cover: bookInfo.cover || null,
          categoryName: bookInfo.categoryName || null,
          itemPage: bookInfo.itemPage || null,
        };

        return result;
      }

      return {
        description: null,
      };
    } catch (error) {
      console.error('알라딘 API 호출 중 오류:', error);
      if (error.response) {
        console.error('오류 응답 데이터:', error.response.data);
        console.error('오류 응답 상태:', error.response.status);
      }
      return {
        description: null,
      };
    }
  }

  /**
   * 책과 대화합니다. 책의 내용, 주제, 등장인물 등에 대해 AI가 답변합니다.
   * @param bookId 책 ID
   * @param message 사용자 메시지
   * @param conversationHistory 대화 기록
   * @returns AI 응답
   */
  async chatWithBook(
    bookId: number,
    message: string,
    conversationHistory: ConversationMessageDto[] = [],
  ): Promise<string> {
    // 책 상세 정보 조회
    const book = await this.findById(bookId);

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    // 작가 정보 추출
    const authors = book.authorBooks?.map((ab) => ab.author) || [];

    // 원작 정보 추출
    const originalWorks =
      book.bookOriginalWorks?.map((bow) => bow.originalWork) || [];

    // AI 응답 생성
    const response = await this.aiService.chatWithBook(
      {
        book,
        authors,
        originalWorks,
        description: book.description || book.title, // 알라딘 설명이 없으면 제목 사용
      },
      message,
      conversationHistory,
    );

    return response;
  }
}
