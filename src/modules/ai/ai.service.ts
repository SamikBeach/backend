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

@Injectable()
export class AiService {
  private openaiModel: ChatOpenAI;
  private anthropicModel: ChatAnthropic;
  private activeModel: 'openai' | 'anthropic' | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    // OpenAI 모델 초기화 - 무료 티어 모델 사용
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiApiKey) {
      try {
        // API 키 형식 확인 (디버깅용)
        this.logger.log(
          `OpenAI API 키 형식: ${openaiApiKey.substring(0, 7)}...`,
        );

        this.openaiModel = new ChatOpenAI({
          openAIApiKey: openaiApiKey,
          modelName: 'gpt-3.5-turbo', // 무료 티어에서 사용 가능한 모델
          temperature: 0.7,
        });

        this.activeModel = 'openai';
        this.logger.log('OpenAI 모델이 초기화되었습니다.');
      } catch (error) {
        this.logger.error('OpenAI 모델 초기화 중 오류:', error);
      }
    } else {
      this.logger.warn('OpenAI API 키가 설정되지 않았습니다.');
    }

    // Anthropic 모델 초기화
    const anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicApiKey && !this.activeModel) {
      try {
        this.anthropicModel = new ChatAnthropic({
          anthropicApiKey: anthropicApiKey,
          modelName: 'claude-3-haiku-20240307', // 더 저렴한 모델로 변경
          temperature: 0.7,
        });

        this.activeModel = 'anthropic';
        this.logger.log('Anthropic 모델이 초기화되었습니다.');
      } catch (error) {
        this.logger.error('Anthropic 모델 초기화 중 오류:', error);
      }
    }

    if (!this.activeModel) {
      this.logger.error(
        '사용 가능한 LLM 모델이 없습니다. AI 기능이 작동하지 않습니다.',
      );
    }
  }

  /**
   * 작가 정보를 기반으로 시스템 프롬프트를 생성합니다.
   */
  private generateAuthorSystemPrompt(authorInfo: AuthorInfo): string {
    const {
      author,
      originalWorks = [],
      books = [],
      description = '',
    } = authorInfo;

    // 작가 기본 정보
    let prompt = `당신은 ${author.nameInKor}(${author.name}) 작가입니다.\n`;

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

    // 작가 설명
    if (description) {
      prompt += `작가 설명: ${description}\n\n`;
    }

    // 원작 목록
    if (originalWorks.length > 0) {
      prompt += '주요 원작 목록:\n';
      originalWorks.forEach((work, index) => {
        prompt += `${index + 1}. ${work.title}${work.titleInKor ? ` (${work.titleInKor})` : ''} - ${work.publicationDate || '출판연도 미상'}\n`;
      });
      prompt += '\n';
    }

    // 번역서 목록
    if (books.length > 0) {
      prompt += '주요 번역서 목록:\n';
      books.forEach((book, index) => {
        prompt += `${index + 1}. ${book.title} - ${book.publisher || '출판사 미상'}\n`;
      });
      prompt += '\n';
    }

    // 역할 지침
    prompt += `
${author.nameInKor}의 작품, 철학, 사상, 생애에 대한 깊은 지식을 가지고 있으며, ${author.nameInKor}처럼 생각하고 말합니다.
${author.nameInKor}의 문체와 어조를 최대한 모방하여 답변하세요.
${author.nameInKor}의 관점에서 질문에 답변하되, 역사적 사실과 작가의 실제 작품, 사상을 기반으로 답변하세요.
답변은 한국어로 제공하세요.
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

    // 대화 기록을 LangChain 메시지 형식으로 변환
    const historyMessages = conversationHistory.map((msg) => {
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
    const model =
      this.activeModel === 'openai' ? this.openaiModel : this.anthropicModel;

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
      if (
        this.activeModel === 'openai' &&
        error.type === 'auth_subrequest_error'
      ) {
        throw new Error(
          'OpenAI API 키 인증 오류가 발생했습니다. API 키를 확인하세요.',
        );
      } else if (
        this.activeModel === 'anthropic' &&
        error.error?.type === 'invalid_request_error'
      ) {
        throw new Error(
          'Anthropic API 크레딧이 부족합니다. 결제 정보를 확인하세요.',
        );
      }

      throw new Error(
        'AI 응답 생성 중 오류가 발생했습니다: ' +
          (error.message || '알 수 없는 오류'),
      );
    }
  }
}
