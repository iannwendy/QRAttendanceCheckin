import { IsString, IsNumber } from 'class-validator';

export class CheckInQRDto {
  @IsString()
  qrToken: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  accuracy: number;
}
