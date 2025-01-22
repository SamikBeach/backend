import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Book } from '@entities/Book';
import { Author } from '@entities/Author';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async search(keyword: string) {
    const [books, authors] = await Promise.all([
      this.bookRepository.find({
        where: [
          { title: Like(`%${keyword}%`) },
          //   { description: Like(`%${keyword}%`) },
        ],
        relations: [
          'authorBooks.author',
          'bookOriginalWorks.originalWork',
          'bookOriginalWorks.originalWork.bookOriginalWorks.book',
        ],
        take: 3,
      }),
      this.authorRepository.find({
        where: [
          { name: Like(`%${keyword}%`) },
          { nameInKor: Like(`%${keyword}%`) },
        ],
        relations: [
          'authorBooks',
          'authorBooks.book',
          'authorBooks.book.bookOriginalWorks',
          'authorBooks.book.bookOriginalWorks.originalWork',
          'authorBooks.book.bookOriginalWorks.originalWork.bookOriginalWorks.book',
        ],
        take: 3,
      }),
    ]);

    const booksWithCount = books.map((book) => {
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

    const authorsWithCount = authors.map((author) => {
      const bookCount = author.authorBooks.length;

      return {
        ...author,
        bookCount,
      };
    });

    return {
      books: booksWithCount,
      authors: authorsWithCount,
    };
  }
}
