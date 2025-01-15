import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { PickType } from '@nestjs/swagger';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(50000, { message: '내용은 최대 50000자까지 가능합니다.' })
  content: string;
}

export class UpdateCommentDto extends PickType(CreateCommentDto, ['content']) {}
