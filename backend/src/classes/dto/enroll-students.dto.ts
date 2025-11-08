import { IsOptional, IsArray, IsString } from 'class-validator';

export class EnrollStudentsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
