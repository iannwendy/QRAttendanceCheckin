/**
 * SINGLETON PATTERN - Config Service Singleton
 * 
 * Bối cảnh: Trong hệ thống có nhiều nơi cần truy cập các cấu hình chung như:
 * - JWT_SECRET
 * - QR_ROTATE_SECONDS  
 * - OTP_STEP_SECONDS
 * - Geofence radius mặc định
 * 
 * Singleton đảm bảo chỉ có một instance ConfigService duy nhất
 * và có thể truy cập ở bất kỳ đâu trong ứng dụng mà không cần inject
 */

import { Injectable, Global } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface AppConfig {
  jwtSecret: string;
  qrRotateSeconds: number;
  otpStepSeconds: number;
  geofenceRadiusDefault: number;
  uploadPath: string;
  nodeEnv: 'development' | 'production';
}

/**
 * Singleton Config Manager
 * Đảm bảo chỉ có một instance duy nhất trong toàn ứng dụng
 * Sử dụng factory pattern của NestJS để đảm bảo singleton
 */
@Global()
@Injectable()
export class ConfigManager {
  private static instance: ConfigManager;
  private config: NestConfigService;

  constructor(config: NestConfigService) {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }
    this.config = config;
    ConfigManager.instance = this;
  }

  static getInstance(config?: NestConfigService): ConfigManager {
    if (!ConfigManager.instance && config) {
      ConfigManager.instance = new ConfigManager(config);
    }
    return ConfigManager.instance;
  }

  /**
   * Lấy JWT Secret
   */
  getJwtSecret(): string {
    return this.config.get('JWT_SECRET') || 'dev_change_me';
  }

  /**
   * Lấy thời gian hiệu lực QR (mặc định 180s)
   */
  getQrRotateSeconds(): number {
    return parseInt(this.config.get('QR_ROTATE_SECONDS') || '180') || 180;
  }

  /**
   * Lấy bước thời gian OTP (mặc định 30s)
   */
  getOtpStepSeconds(): number {
    return parseInt(this.config.get('OTP_STEP_SECONDS') || '30') || 30;
  }

  /**
   * Lấy bán kính geofence mặc định (mặc định 100m)
   */
  getGeofenceRadiusDefault(): number {
    return parseInt(this.config.get('GEOFENCE_RADIUS_DEFAULT') || '100') || 100;
  }

  /**
   * Lấy đường dẫn upload
   */
  getUploadPath(): string {
    return this.config.get('UPLOAD_PATH') || './uploads';
  }

  /**
   * Lấy môi trường hiện tại
   */
  getNodeEnv(): 'development' | 'production' {
    return (this.config.get('NODE_ENV') as 'development' | 'production') || 'development';
  }

  /**
   * Lấy tất cả cấu hình
   */
  getAll(): AppConfig {
    return {
      jwtSecret: this.getJwtSecret(),
      qrRotateSeconds: this.getQrRotateSeconds(),
      otpStepSeconds: this.getOtpStepSeconds(),
      geofenceRadiusDefault: this.getGeofenceRadiusDefault(),
      uploadPath: this.getUploadPath(),
      nodeEnv: this.getNodeEnv(),
    };
  }
}

