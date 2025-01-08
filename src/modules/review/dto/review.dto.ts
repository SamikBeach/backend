import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { PickType } from '@nestjs/swagger';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MinLength(2, { message: '제목은 최소 2자 이상이어야 합니다.' })
  @MaxLength(100, { message: '제목은 최대 100자까지 가능합니다.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MinLength(10, { message: '내용은 최소 10자 이상이어야 합니다.' })
  @MaxLength(2000, { message: '내용은 최대 2000자까지 가능합니다.' })
  content: string;
}

export class UpdateReviewDto extends PickType(CreateReviewDto, [
  'title',
  'content',
]) {}
