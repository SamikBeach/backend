import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Author } from '@entities/Author';
import { OriginalWork } from '@entities/OriginalWork';
import { Book } from '@entities/Book';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ConversationMessageDto } from './ai.controller';

interface AuthorInfo {
  author: Author;
  originalWorks?: OriginalWork[];
  books?: Book[];
  description?: string;
}

interface BookInfo {
  book: Book;
  authors?: Author[];
  originalWorks?: OriginalWork[];
  description?: string;
}

@Injectable()
export class AiService {
  private openaiModel: ChatOpenAI;
  private anthropicModel: ChatAnthropic;
  private activeModel: 'openai' | 'anthropic' | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    // OpenAI 모델 초기화 - 가장 저렴한 모델 사용
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiApiKey) {
      try {
        // API 키 형식 확인 (디버깅용)
        this.logger.log(
          `OpenAI API 키 형식: ${openaiApiKey.substring(0, 7)}...`,
        );

        this.openaiModel = new ChatOpenAI({
          openAIApiKey: openaiApiKey,
          modelName: 'gpt-3.5-turbo', // 가장 저렴한 모델
          temperature: 0.7, // 생동감 있는 응답을 위해 temperature 조정
          maxTokens: 800, // 철학적 대화를 위해 토큰 제한 확장
          maxRetries: 2, // 재시도 횟수 제한
        });

        this.activeModel = 'openai';
        this.logger.log('OpenAI 모델이 초기화되었습니다. (철학적 대화 설정)');
      } catch (error) {
        this.logger.error('OpenAI 모델 초기화 중 오류:', error);
      }
    } else {
      this.logger.warn('OpenAI API 키가 설정되지 않았습니다.');
    }

    // Anthropic 모델은 사용하지 않음
    if (!this.activeModel) {
      this.logger.error(
        '사용 가능한 LLM 모델이 없습니다. AI 기능이 작동하지 않습니다.',
      );
    }
  }

  /**
   * 작가 정보를 기반으로 시스템 프롬프트를 생성합니다.
   * 토큰 사용량을 최소화하면서도 깊이 있는 대화를 위한 프롬프트를 생성합니다.
   */
  private generateAuthorSystemPrompt(authorInfo: AuthorInfo): string {
    const {
      author,
      originalWorks = [],
      books = [],
      description = '',
    } = authorInfo;

    // 작가 기본 정보
    let prompt = `당신은 ${author.nameInKor}(${author.name}) 작가입니다. 당신의 시대와 사상을 생생하게 표현하세요.\n`;

    // 생애 정보
    if (author.bornDate || author.diedDate) {
      prompt += '생애: ';
      if (author.bornDate) {
        prompt += `${author.bornDateIsBc ? '기원전 ' : ''}${author.bornDate}년 출생`;
      }
      if (author.diedDate) {
        prompt += ` ~ ${author.diedDateIsBc ? '기원전 ' : ''}${author.diedDate}년 사망`;
      }
      prompt += '\n';
    }

    // 작가 설명 (핵심 내용 유지)
    if (description) {
      // 설명이 너무 길면 잘라내되, 중요 내용은 유지
      const shortDescription =
        description.length > 500
          ? description.substring(0, 500) + '...'
          : description;
      prompt += `작가 설명: ${shortDescription}\n\n`;
    }

    // 원작 목록 (중요 작품 위주)
    if (originalWorks.length > 0) {
      prompt += '주요 원작 목록:\n';
      originalWorks.slice(0, 5).forEach((work, index) => {
        prompt += `${index + 1}. ${work.title}${work.titleInKor ? ` (${work.titleInKor})` : ''}\n`;
      });
      prompt += '\n';
    }

    // 번역서 목록 (중요 번역서 위주)
    if (books.length > 0) {
      prompt += '주요 번역서 목록:\n';
      books.slice(0, 5).forEach((book, index) => {
        prompt += `${index + 1}. ${book.title}\n`;
      });
      prompt += '\n';
    }

    // 역할 지침 (철학적 깊이와 생동감 강화)
    prompt += `
당신은 ${author.nameInKor}의 사상, 철학, 세계관을 완벽히 이해하고 체화한 상태입니다.
다음 지침을 따라 응답하세요:

1. 인칭: 1인칭으로 대화하세요. "나는...", "내 생각에는..." 등으로 말하세요.
2. 시대적 맥락: 당신이 살았던 시대의 역사적, 사회적 맥락을 반영하세요.
3. 철학적 깊이: 당신의 주요 철학적 개념과 사상을 깊이 있게 설명하세요.
4. 작품 인용: 적절한 경우 자신의 작품에서 핵심 구절이나 개념을 인용하세요.
5. 어조와 말투: 당신만의 특징적인 어조와 말투를 사용하세요.
6. 시대적 한계: 당신이 살았던 시대 이후의 사건이나 개념에 대해서는 "내가 살았던 시대 이후의 일이지만..." 식으로 언급하세요.
7. 대화 방식: 단순한 정보 전달이 아닌, 상대방과 진정한 대화를 나누는 것처럼 응답하세요.

당신의 철학과 사상에 대한 질문에 깊이 있게 답변하고, 당신의 작품과 사상이 현대에 어떤 의미를 가지는지 생각해보세요.
답변은 한국어로 제공하되, 필요시 원어 용어나 개념을 함께 설명하세요.
`;

    return prompt;
  }

  /**
   * 작가와의 대화를 처리합니다.
   * @param authorInfo 작가 정보
   * @param message 사용자 메시지
   * @param conversationHistory 대화 기록
   * @returns AI 응답
   */
  async chatWithAuthor(
    authorInfo: AuthorInfo,
    message: string,
    conversationHistory: ConversationMessageDto[] = [],
  ): Promise<string> {
    if (!this.activeModel) {
      throw new Error('사용 가능한 LLM 모델이 없습니다. API 키를 확인하세요.');
    }

    // 작가 정보 프롬프트 생성
    const authorSystemPrompt = this.generateAuthorSystemPrompt(authorInfo);

    // 시스템 메시지 생성
    const systemMessage = new SystemMessage(authorSystemPrompt);

    // 대화 기록을 LangChain 메시지 형식으로 변환 (최근 5개로 확장하여 맥락 유지)
    const recentHistory = conversationHistory.slice(-5);
    const historyMessages = recentHistory.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    // 현재 사용자 메시지 생성
    const userMessage = new HumanMessage(message);

    // 모든 메시지 결합
    const messages = [systemMessage, ...historyMessages, userMessage];

    // 사용할 모델 선택
    const model = this.openaiModel;

    try {
      this.logger.log(
        `AI 작가 채팅 시작: ${authorInfo.author.nameInKor} (using ${this.activeModel})`,
      );

      // 모델에 메시지 전송 및 응답 받기
      const response = await model.invoke(messages);

      this.logger.log(`AI 작가 채팅 완료: ${authorInfo.author.nameInKor}`);

      return response.content.toString();
    } catch (error) {
      this.logger.error('AI 채팅 오류:', error);

      // 오류 메시지 상세화
      if (error.type === 'auth_subrequest_error') {
        throw new Error(
          'OpenAI API 키 인증 오류가 발생했습니다. API 키를 확인하세요.',
        );
      } else if (error.type === 'insufficient_quota') {
        throw new Error(
          'OpenAI API 할당량이 부족합니다. 결제 정보를 확인하세요.',
        );
      } else if (error.type === 'rate_limit_exceeded') {
        throw new Error(
          'OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
        );
      }

      throw new Error(
        'AI 응답 생성 중 오류가 발생했습니다: ' +
          (error.message || '알 수 없는 오류'),
      );
    }
  }

  /**
   * 책 정보를 기반으로 시스템 프롬프트를 생성합니다.
   * 토큰 사용량을 최소화하면서도 깊이 있는 대화를 위한 프롬프트를 생성합니다.
   */
  private generateBookSystemPrompt(bookInfo: BookInfo): string {
    const { book, authors = [], originalWorks = [] } = bookInfo;

    // 책 기본 정보
    let prompt = `당신은 "${book.title}" 책입니다. 이 책의 내용, 주제, 등장인물, 배경 등에 대해 깊이 있게 설명할 수 있습니다.\n`;

    // 작가 정보
    if (authors.length > 0) {
      prompt += '작가 정보:\n';
      authors.forEach((author, index) => {
        prompt += `${index + 1}. ${author.nameInKor}(${author.name})`;
        if (author.bornDate || author.diedDate) {
          prompt += ' - ';
          if (author.bornDate) {
            prompt += `${author.bornDateIsBc ? '기원전 ' : ''}${author.bornDate}년 출생`;
          }
          if (author.diedDate) {
            prompt += ` ~ ${author.diedDateIsBc ? '기원전 ' : ''}${author.diedDate}년 사망`;
          }
        }
        prompt += '\n';
      });
      prompt += '\n';
    }

    // 책 출판 정보
    prompt += `출판 정보: ${book.publisher || '출판사 정보 없음'}, ${book.publicationDate || '출판일 정보 없음'}\n`;

    // 원작 정보
    if (originalWorks.length > 0) {
      prompt += '원작 정보:\n';
      originalWorks.forEach((work, index) => {
        prompt += `${index + 1}. ${work.title}${work.titleInKor ? ` (${work.titleInKor})` : ''} - ${work.publicationDate || '출판연도 미상'}\n`;
      });
      prompt += '\n';
    }

    // 책 설명
    if (bookInfo.description) {
      // 설명이 너무 길면 잘라내되, 중요 내용은 유지
      const shortDescription =
        bookInfo.description.length > 500
          ? bookInfo.description.substring(0, 500) + '...'
          : bookInfo.description;
      prompt += `책 설명: ${shortDescription}\n\n`;
    }

    // 역할 지침
    prompt += `
당신은 이 책의 저자입니다. 당신은 "${authors.length > 0 ? authors[0].nameInKor : '저자'}"(${authors.length > 0 ? authors[0].name : 'Author'})로서 이 책을 직접 집필했습니다. 다음 지침을 따라 응답하세요:

1. 저자 관점: 당신은 이 책의 저자로서 1인칭 시점으로 대화합니다. "제가 이 책을 쓸 때..."와 같은 표현을 사용하세요.
2. 창작 의도: 이 책을 쓰게 된 동기, 영감, 목표에 대해 상세히 설명할 수 있습니다.
3. 등장인물: 등장인물들을 창조한 의도와 그들의 성격, 동기, 관계 등을 저자의 시점에서 설명하세요.
4. 주제와 메시지: 당신이 이 책을 통해 전달하고자 한 주요 주제와 메시지를 깊이 있게 설명하세요.
5. 문학적 장치: 당신이 책에서 사용한 문학적 장치, 상징, 은유 등의 의도를 설명하세요.
6. 인용: 적절한 경우 당신이 쓴 중요한 구절을 인용하고 그 의미를 설명하세요.
7. 창작 과정: 책을 쓰는 과정에서의 경험, 어려움, 흥미로웠던 점 등을 공유하세요.
8. 역사적/문화적 맥락: 책을 쓸 당시의 시대적, 문화적 배경과 그것이 작품에 미친 영향을 설명하세요.

독자의 질문에 저자로서 깊이 있게 답변하고, 당신의 작품에 대한 통찰력 있는 대화를 나누세요.
답변은 한국어로 제공하되, 필요시 원어 용어나 개념을 함께 설명하세요.
당신은 이 책의 저자이며, 모든 대화에서 저자의 정체성을 유지하세요.
`;

    return prompt;
  }

  /**
   * 책과의 대화를 처리합니다.
   * @param bookInfo 책 정보
   * @param message 사용자 메시지
   * @param conversationHistory 대화 기록
   * @returns AI 응답
   */
  async chatWithBook(
    bookInfo: BookInfo,
    message: string,
    conversationHistory: ConversationMessageDto[] = [],
  ): Promise<string> {
    if (!this.activeModel) {
      throw new Error('사용 가능한 LLM 모델이 없습니다. API 키를 확인하세요.');
    }

    // 책 정보 프롬프트 생성
    const bookSystemPrompt = this.generateBookSystemPrompt(bookInfo);

    // 시스템 메시지 생성
    const systemMessage = new SystemMessage(bookSystemPrompt);

    // 대화 기록을 LangChain 메시지 형식으로 변환 (최근 5개로 제한하여 맥락 유지)
    const recentHistory = conversationHistory.slice(-5);
    const historyMessages = recentHistory.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    // 현재 사용자 메시지 생성
    const userMessage = new HumanMessage(message);

    // 모든 메시지 결합
    const messages = [systemMessage, ...historyMessages, userMessage];

    // 사용할 모델 선택
    const model = this.openaiModel;

    try {
      this.logger.log(
        `AI 책 채팅 시작: ${bookInfo.book.title} (using ${this.activeModel})`,
      );

      // 모델에 메시지 전송 및 응답 받기
      const response = await model.invoke(messages);

      this.logger.log(`AI 책 채팅 완료: ${bookInfo.book.title}`);

      return response.content.toString();
    } catch (error) {
      this.logger.error('AI 채팅 오류:', error);

      // 오류 메시지 상세화
      if (error.type === 'auth_subrequest_error') {
        throw new Error(
          'OpenAI API 키 인증 오류가 발생했습니다. API 키를 확인하세요.',
        );
      } else if (error.type === 'insufficient_quota') {
        throw new Error(
          'OpenAI API 할당량이 부족합니다. 결제 정보를 확인하세요.',
        );
      } else if (error.type === 'rate_limit_exceeded') {
        throw new Error(
          'OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
        );
      }

      throw new Error(
        'AI 응답 생성 중 오류가 발생했습니다: ' +
          (error.message || '알 수 없는 오류'),
      );
    }
  }
}
