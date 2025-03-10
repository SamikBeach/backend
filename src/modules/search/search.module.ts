import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '@entities/Book';
import { Author } from '@entities/Author';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Author])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
