import {
  Body,
  Controller,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthorService } from '../author/author.service';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversationHistory?: ConversationMessageDto[];
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly authorService: AuthorService,
  ) {}

  /**
   * 작가와 대화합니다.
   * @param authorId 작가 ID
   * @param chatMessageDto 채팅 메시지 정보
   * @returns AI 응답
   */
  @Post('author/:id/chat')
  @UseGuards(JwtAuthGuard)
  async chatWithAuthor(
    @Param('id', ParseIntPipe) authorId: number,
    @Body() chatMessageDto: ChatMessageDto,
  ) {
    // 작가 상세 정보 조회
    const authorDetail = await this.authorService.findById(authorId);

    // 작가의 책 목록 조회
    const books = await this.authorService.getAllAuthorBooks(authorId);

    // AI 응답 생성
    const response = await this.aiService.chatWithAuthor(
      {
        author: authorDetail,
        originalWorks: authorDetail.originalWorks || [],
        books: books,
        description: authorDetail.description,
      },
      chatMessageDto.message,
      chatMessageDto.conversationHistory || [],
    );

    return {
      authorId,
      authorName: authorDetail.nameInKor,
      response,
      timestamp: new Date().toISOString(),
    };
  }
}
