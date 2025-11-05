import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string; // admin | lecturer | MSSV (ví dụ: 523H0001)

  @IsOptional()
  @IsString()
  email?: string; // chấp nhận tạm thời để tương thích cũ

  @IsString()
  @MinLength(6)
  password: string;
}

