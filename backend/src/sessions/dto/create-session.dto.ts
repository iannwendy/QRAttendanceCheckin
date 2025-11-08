import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @Min(10)
  geofenceRadius: number;

  // Required human-friendly code, up to 6 alphanumeric characters (letters/numbers)
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  @Matches(/^[A-Za-z0-9]+$/)
  publicCode: string;
}
