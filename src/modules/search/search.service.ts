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
        relations: ['authorBooks.author'],
        take: 3,
      }),
      this.authorRepository.find({
        where: [
          { name: Like(`%${keyword}%`) },
          { nameInKor: Like(`%${keyword}%`) },
        ],
        take: 3,
      }),
    ]);

    return {
      books,
      authors,
    };
  }
}
