import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '@entities/Book';
import { UserBook } from '@entities/UserBook';
import { Review } from '@entities/Review';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(UserBook)
    private readonly userBookRepository: Repository<UserBook>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  /**
   * ID로 책을 찾습니다.
   */
  async findById(id: number) {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['authorBooks', 'authorBooks.author'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    // Transform the response to include authors directly
    return {
      ...book,
      authors: book.authorBooks.map((ab) => ab.author),
    };
  }

  /**
   * 책을 검색하고 페이지네이션된 결과를 반환합니다.
   */
  async search(query: PaginateQuery) {
    return paginate(query, this.bookRepository, {
      sortableColumns: [
        'id',
        'title',
        'publisher',
        'publicationDate',
        'likeCount',
        'reviewCount',
      ],
      searchableColumns: [
        'title',
        'description',
        'publisher',
        'isbn',
        'isbn13',
      ],
      defaultSortBy: [['id', 'DESC']],
      relations: ['authorBooks', 'authorBooks.author'],
      filterableColumns: {
        title: [FilterOperator.ILIKE],
        publisher: [FilterOperator.ILIKE],
        isbn: [FilterOperator.EQ],
        isbn13: [FilterOperator.EQ],
      },
      maxLimit: 100,
    });
  }

  /**
   * 책 좋아요를 토글합니다.
   */
  async toggleLike(userId: number, bookId: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const existingLike = await this.userBookRepository.findOne({
      where: { userId, bookId },
    });

    if (existingLike) {
      await this.userBookRepository.remove(existingLike);
      await this.bookRepository.decrement({ id: bookId }, 'likeCount', 1);
      return { liked: false };
    } else {
      await this.userBookRepository.save({
        userId,
        bookId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.bookRepository.increment({ id: bookId }, 'likeCount', 1);
      return { liked: true };
    }
  }

  /**
   * 연관된 책 목록(같은 저자의 다른 책들)을 조회합니다.
   */
  async getRelatedBooks(bookId: number, query: PaginateQuery) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['authorBooks', 'authorBooks.author'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const authorIds = book.authorBooks.map((ab) => ab.author.id);

    return paginate(
      query,
      this.bookRepository
        .createQueryBuilder('book')
        .innerJoinAndSelect('book.authorBooks', 'ab')
        .innerJoinAndSelect('ab.author', 'author')
        .where('author.id IN (:...authorIds)', { authorIds })
        .andWhere('book.id != :bookId', { bookId }),
      {
        sortableColumns: [
          'id',
          'title',
          'publicationDate',
          'likeCount',
          'reviewCount',
        ],
        defaultSortBy: [['publicationDate', 'DESC']],
        maxLimit: 20,
      },
    );
  }

  /**
   * 책의 리뷰 목록을 조회합니다.
   */
  async getBookReviews(bookId: number, query: PaginateQuery) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    return paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      where: { bookId },
      relations: ['user'],
    });
  }
}
