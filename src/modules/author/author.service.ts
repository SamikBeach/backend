import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Author } from '@entities/Author';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Book } from '@entities/Book';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Review } from '@entities/Review';

@Injectable()
export class AuthorService {
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
  ) {}

  /**
   * ID로 저자를 찾습니다.
   */
  async findById(id: number, userId?: number) {
    const author = await this.authorRepository.findOne({
      where: { id },
      relations: ['authorBooks.book'],
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    const bookCount = author.authorBooks.length;

    const response = {
      ...author,
      bookCount,
    };

    if (userId) {
      const userLike = await this.userAuthorLikeRepository.findOne({
        where: { userId, authorId: id },
      });

      return {
        ...response,
        isLiked: !!userLike,
      };
    }

    return response;
  }

  /**
   * 저자를 검색하고 페이지네이션된 결과를 반환합니다.
   */
  async searchAuthors(query: PaginateQuery, userId?: number) {
    const authors = await paginate(query, this.authorRepository, {
      sortableColumns: [
        'id',
        'name',
        'nameInKor',
        'bornDate',
        'diedDate',
        'likeCount',
        'reviewCount',
      ],
      searchableColumns: ['name', 'nameInKor'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        nameInKor: [FilterOperator.ILIKE],
        genre_id: [FilterOperator.EQ],
      },
      relations: ['authorBooks'],
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

    return this.bookRepository.find({
      where: {
        authorBooks: {
          author: {
            id: authorId,
          },
        },
      },
      relations: ['authorBooks', 'authorBooks.author'],
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
  async getAuthorReviews(authorId: number, query: PaginateQuery) {
    const author = await this.authorRepository.findOne({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    return paginate(query, this.reviewRepository, {
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
  }
}
