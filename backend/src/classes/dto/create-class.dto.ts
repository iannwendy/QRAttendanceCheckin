import { IsString, IsNotEmpty } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
