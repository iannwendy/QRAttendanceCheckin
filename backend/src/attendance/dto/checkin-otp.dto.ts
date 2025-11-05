import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckInOTPDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  meta: {
    studentCode: string;
    timestamp: string;
  };
}

