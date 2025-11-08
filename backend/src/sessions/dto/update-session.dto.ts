import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

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
  @IsString()
  @MaxLength(6)
  @Matches(/^[A-Za-z0-9]+$/)
  publicCode?: string;
}
