import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

export class QuickCreateSessionDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  geofenceRadius?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  @Matches(/^[A-Za-z0-9]+$/)
  publicCode?: string;
}
