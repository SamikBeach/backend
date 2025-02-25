import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { Author } from '@entities/Author';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Book } from '@entities/Book';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { Review } from '@entities/Review';
import { UserReviewLike } from '@entities/UserReviewLike';
import { addKoreanSearchCondition } from '@utils/search';
import axios from 'axios';
import { AuthorDetailResponse } from './dto/author.dto';

interface WikiPage {
  extract?: string;
  pageid?: number;
  title?: string;
}

interface WikiResponse {
  query: {
    pages: {
      [key: string]: WikiPage;
    };
  };
}

interface WikiDataResponse {
  head: {
    vars: string[];
  };
  results: {
    bindings: Array<{
      influenced?: {
        value: string;
      };
      influencedLabel?: {
        value: string;
      };
      influencedEnLabel?: {
        value: string;
      };
      influencedBy?: {
        value: string;
      };
      influencedByLabel?: {
        value: string;
      };
      influencedByEnLabel?: {
        value: string;
      };
      item?: {
        value: string;
      };
      itemLabel?: {
        value: string;
      };
    }>;
  };
}

@Injectable()
export class AuthorService {
  private readonly wikiApiUrl = 'https://ko.wikipedia.org/w/api.php';
  private readonly wikiDataUrl = 'https://query.wikidata.org/sparql';

  constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(UserAuthorLike)
    private readonly userAuthorLikeRepository: Repository<UserAuthorLike>,
    private readonly dataSource: DataSource,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(UserReviewLike)
    private readonly userReviewLikeRepository: Repository<UserReviewLike>,
  ) {}

  /**
   * 저자의 기본 정보만 조회합니다.
   */
  async findAuthorBasicInfo(id: number) {
    const author = await this.authorRepository.findOne({
      where: { id },
      select: ['id', 'name', 'nameInKor'],
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    return author;
  }

  /**
   * 영향을 준 저자들을 조회합니다.
   */
  async getInfluencedAuthors(nameInKor: string) {
    try {
      const query = `
        SELECT ?influenced ?influencedLabel ?influencedEnLabel WHERE {
          ?person rdfs:label "${nameInKor}"@ko.
          ?person wdt:P737 ?influenced.
          ?influenced wdt:P31 wd:Q5.  # instance of human
          ?influenced rdfs:label ?influencedEnLabel.
          ?influenced rdfs:label ?influencedLabel.
          FILTER(LANG(?influencedEnLabel) = "en")
          FILTER(LANG(?influencedLabel) = "ko")
          SERVICE wikibase:label { bd:serviceParam wikibase:language "ko". }
        }
      `;

      const response = await axios.get<WikiDataResponse>(this.wikiDataUrl, {
        params: {
          query,
          format: 'json',
        },
      });

      const authorNames = response.data.results.bindings
        .map((binding) => ({
          name: binding.influencedEnLabel?.value,
          nameInKor: binding.influencedLabel?.value,
        }))
        .filter((author) => author.name && author.nameInKor);

      // DB에서 한 번에 모든 저자 조회
      const dbAuthors = await this.authorRepository
        .createQueryBuilder('author')
        .where(
          '(author.nameInKor IN (:...names) OR author.name IN (:...names))',
          {
            names: [
              ...authorNames.map((a) => a.nameInKor),
              ...authorNames.map((a) => a.name),
            ],
          },
        )
        .getMany();

      // DB 저자를 이름으로 빠르게 찾기 위한 맵 생성
      const authorMap = new Map<string, Author>();
      dbAuthors.forEach((author) => {
        authorMap.set(author.nameInKor, author);
        authorMap.set(author.name, author);
      });

      const influenced = authorNames.map((authorName) => {
        const dbAuthor =
          authorMap.get(authorName.nameInKor) || authorMap.get(authorName.name);
        return {
          ...(dbAuthor || {
            id: -Math.floor(Math.random() * 1000000),
            name: authorName.name,
            nameInKor: authorName.nameInKor,
            bornDate: null,
            bornDateIsBc: null,
            isWikiData: true,
          }),
          isWikiData: !dbAuthor,
        };
      });

      return this.sortAuthors(influenced);
    } catch (error) {
      console.error('위키데이터 API 호출 중 오류:', error);
      return [];
    }
  }

  /**
   * 영향을 받은 저자들을 조회합니다.
   */
  async getInfluencedByAuthors(nameInKor: string) {
    try {
      const query = `
        SELECT ?influencedBy ?influencedByLabel ?influencedByEnLabel WHERE {
          ?person rdfs:label "${nameInKor}"@ko.
          ?influencedBy wdt:P737 ?person.
          ?influencedBy wdt:P31 wd:Q5.  # instance of human
          ?influencedBy rdfs:label ?influencedByEnLabel.
          ?influencedBy rdfs:label ?influencedByLabel.
          FILTER(LANG(?influencedByEnLabel) = "en")
          FILTER(LANG(?influencedByLabel) = "ko")
          SERVICE wikibase:label { bd:serviceParam wikibase:language "ko". }
        }
      `;

      const response = await axios.get<WikiDataResponse>(this.wikiDataUrl, {
        params: {
          query,
          format: 'json',
        },
      });

      const authorNames = response.data.results.bindings
        .map((binding) => ({
          name: binding.influencedByEnLabel?.value,
          nameInKor: binding.influencedByLabel?.value,
        }))
        .filter((author) => author.name && author.nameInKor);

      // DB에서 한 번에 모든 저자 조회
      const dbAuthors = await this.authorRepository
        .createQueryBuilder('author')
        .where(
          '(author.nameInKor IN (:...names) OR author.name IN (:...names))',
          {
            names: [
              ...authorNames.map((a) => a.nameInKor),
              ...authorNames.map((a) => a.name),
            ],
          },
        )
        .getMany();

      // DB 저자를 이름으로 빠르게 찾기 위한 맵 생성
      const authorMap = new Map<string, Author>();
      dbAuthors.forEach((author) => {
        authorMap.set(author.nameInKor, author);
        authorMap.set(author.name, author);
      });

      const influencedBy = authorNames.map((authorName) => {
        const dbAuthor =
          authorMap.get(authorName.nameInKor) || authorMap.get(authorName.name);
        return {
          ...(dbAuthor || {
            id: -Math.floor(Math.random() * 1000000),
            name: authorName.name,
            nameInKor: authorName.nameInKor,
            bornDate: null,
            bornDateIsBc: null,
            isWikiData: true,
          }),
          isWikiData: !dbAuthor,
        };
      });

      return this.sortAuthors(influencedBy);
    } catch (error) {
      console.error('위키데이터 API 호출 중 오류:', error);
      return [];
    }
  }

  /**
   * 저자들을 태어난 순으로 정렬합니다.
   */
  private sortAuthors(authors: any[]) {
    // 연도를 숫자로 변환하는 헬퍼 함수
    const getYearNumber = (date: string | null) => {
      if (!date) return null;
      // YYYY-MM-DD 또는 YYYY 형식 지원
      const yearMatch = date.match(/^(\d{1,4})/);
      return yearMatch ? parseInt(yearMatch[1]) : null;
    };

    // 저자의 출생 연도를 가져오는 함수 (BC는 음수로 변환)
    const getBirthYear = (author: any) => {
      const year = getYearNumber(author.bornDate);
      if (year === null) return null;
      return author.bornDateIsBc ? -year : year;
    };

    return authors.sort((a, b) => {
      // WikiData 저자는 뒤로
      if (a.isWikiData !== b.isWikiData) {
        return a.isWikiData ? 1 : -1;
      }

      const yearA = getBirthYear(a);
      const yearB = getBirthYear(b);

      // 둘 다 출생연도가 없으면 이름순
      if (yearA === null && yearB === null) {
        return a.nameInKor.localeCompare(b.nameInKor);
      }

      // 출생연도가 없는 쪽이 뒤로
      if (yearA === null) return 1;
      if (yearB === null) return -1;

      // 연도 비교 (BC는 음수이므로 자동으로 더 작은 값으로 처리됨)
      return yearA - yearB;
    });
  }

  /**
   * 위키피디아 API에서 저자 정보를 가져옵니다.
   */
  private async getWikiInfo(nameInKor: string) {
    try {
      // 한국어 위키피디아 검색
      const korResponse = await axios.get<WikiResponse>(this.wikiApiUrl, {
        params: {
          action: 'query',
          format: 'json',
          prop: 'extracts',
          exintro: true,
          explaintext: true,
          titles: nameInKor.trim(),
        },
      });

      const korPages = korResponse.data.query.pages;
      const korPage = Object.values(korPages)[0] as WikiPage;

      return {
        description: korPage?.extract || null,
      };
    } catch (error) {
      console.error('위키피디아 API 호출 중 오류:', error);
      return {
        description: null,
      };
    }
  }

  /**
   * ID로 저자를 찾습니다.
   */
  async findById(id: number, userId?: number): Promise<AuthorDetailResponse> {
    const author = await this.authorRepository.findOne({
      where: { id },
      relations: ['authorBooks.book'],
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    const bookCount = author.authorBooks.length;

    // 위키피디아 정보만 가져오기
    const wikiInfo = await this.getWikiInfo(author.nameInKor);

    const response: AuthorDetailResponse = {
      ...author,
      bookCount,
      ...wikiInfo,
    };

    if (userId) {
      const userLike = await this.userAuthorLikeRepository.findOne({
        where: { userId, authorId: id },
      });

      response.isLiked = !!userLike;
    }

    return response;
  }

  /**
   * 저자를 검색하고 페이지네이션된 결과를 반환합니다.
   */
  async searchAuthors(query: PaginateQuery, userId?: number) {
    const queryBuilder = this.authorRepository
      .createQueryBuilder('author')
      .leftJoinAndSelect('author.authorBooks', 'authorBooks');

    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          addKoreanSearchCondition(
            qb,
            'author.name',
            query.search,
            'authorName',
          );
          addKoreanSearchCondition(
            qb,
            'author.nameInKor',
            query.search,
            'authorNameKor',
          );
        }),
      );
    }

    if (query.filter?.eraId) {
      queryBuilder.andWhere('author.eraId = :eraId', {
        eraId: Number(query.filter.eraId),
      });
    }

    const authors = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'nameInKor',
        'bornDate',
        'diedDate',
        'likeCount',
        'reviewCount',
      ],
      defaultSortBy: [['id', 'DESC']],
      maxLimit: 100,
    });

    // 각 저자에 대해 책 개수 추가
    authors.data = authors.data.map((author) => ({
      ...author,
      bookCount: author.authorBooks.length,
    }));

    if (userId) {
      const userLikes = await this.userAuthorLikeRepository.find({
        where: {
          userId,
          authorId: In(authors.data.map((author) => author.id)),
        },
      });

      const likedAuthorIds = new Set(userLikes.map((like) => like.authorId));

      authors.data = authors.data.map((author) => ({
        ...author,
        isLiked: likedAuthorIds.has(author.id),
      }));
    }

    return authors;
  }
  /**
   * 저자 좋아요를 토글합니다.
   */
  async toggleLike(userId: number, authorId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const author = await queryRunner.manager.findOne(Author, {
        where: { id: authorId },
      });

      if (!author) {
        throw new NotFoundException('저자를 찾을 수 없습니다.');
      }

      const existingLike = await queryRunner.manager.findOne(UserAuthorLike, {
        where: { userId, authorId },
      });

      if (existingLike) {
        await queryRunner.manager.remove(UserAuthorLike, existingLike);
        // likeCount 감소
        await queryRunner.manager.decrement(
          Author,
          { id: authorId },
          'likeCount',
          1,
        );
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserAuthorLike, {
          userId,
          authorId,
        });
        // likeCount 증가
        await queryRunner.manager.increment(
          Author,
          { id: authorId },
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
   * 저자가 쓴 모든 책 목록을 조회합니다.
   */
  async getAllAuthorBooks(authorId: number) {
    const author = await this.authorRepository.findOne({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    const books = await this.bookRepository.find({
      where: {
        authorBooks: {
          author: {
            id: authorId,
          },
        },
      },
      relations: [
        'authorBooks',
        'authorBooks.author',
        'bookOriginalWorks.originalWork',
        'bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
      order: {
        publicationDate: 'DESC',
      },
    });

    // 각 책에 대해 전체 번역서 개수 추가
    return books.map((book) => {
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
  }

  /**
   * 모든 저자 목록을 가져옵니다.
   * 이름 오름차순으로 정렬됩니다.
   */
  async getAllAuthors() {
    return this.authorRepository.find({
      order: {
        nameInKor: 'ASC',
        name: 'ASC',
      },
      select: {
        id: true,
        name: true,
        nameInKor: true,
        likeCount: true,
        reviewCount: true,
      },
    });
  }

  /**
   * 저자의 책들에 대한 리뷰 목록을 조회합니다.
   */
  async getAuthorReviews(
    authorId: number,
    query: PaginateQuery,
    userId?: number,
  ) {
    const author = await this.authorRepository.findOne({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    const reviews = await paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt', 'likeCount'],
      defaultSortBy: [['createdAt', 'DESC']],
      relations: [
        'book',
        'book.authorBooks',
        'book.authorBooks.author',
        'user',
      ],
      where: {
        book: {
          authorBooks: {
            author: {
              id: authorId,
            },
          },
        },
      },
      maxLimit: 100,
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
}
