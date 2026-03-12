/**
 * ADAPTER PATTERN - QR Token Format Adapter
 * 
 * Bối cảnh: Hệ thống hỗ trợ nhiều định dạng QR token khác nhau:
 * 1. JWT token (signed)
 * 2. JSON string (với sessionId và nonce)
 * 3. Raw JSON payload (decode không verify)
 * 
 * Adapter giúp chuẩn hóa tất cả các định dạng này thành QRTokenPayload thống nhất
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface QRTokenPayload {
  sessionId: string;
  nonce: string;
  iat: number;
  exp: number;
  type: 'ATTEND_TOKEN';
  ver: number;
  publicCode?: string | null;
  className?: string | null;
  classCode?: string | null;
  sessionTitle?: string | null;
}

/**
 * Interface chuẩn cho các adapter QR token
 */
export interface QRTokenAdapter {
  /**
   * Kiểm tra xem adapter này có thể xử lý token không
   */
  canHandle(token: string): boolean;
  
  /**
   * Parse và validate token
   */
  parse(token: string): QRTokenPayload | null;
}

/**
 * Adapter cho JWT token
 */
@Injectable()
export class JWTTokenAdapter implements QRTokenAdapter {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canHandle(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3;
  }

  parse(token: string): QRTokenPayload | null {
    const secret = this.configService.get('JWT_SECRET') || 'dev_change_me';
    try {
      return this.jwtService.verify<QRTokenPayload>(token, {
        secret,
        clockTolerance: 5,
      });
    } catch {
      return null;
    }
  }
}

/**
 * Adapter cho JSON string token
 */
@Injectable()
export class JSONTokenAdapter implements QRTokenAdapter {
  canHandle(token: string): boolean {
    try {
      const parsed = JSON.parse(token);
      return !!(parsed.sessionId && parsed.nonce);
    } catch {
      return false;
    }
  }

  parse(token: string): QRTokenPayload | null {
    try {
      const parsed = JSON.parse(token);
      if (!parsed.sessionId || !parsed.nonce) {
        return null;
      }
      
      const now = Math.floor(Date.now() / 1000);
      if (parsed.exp && parsed.exp >= now) {
        return parsed as QRTokenPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Adapter cho raw decoded JWT payload (không verify signature)
 */
@Injectable()
export class RawJWTPayloadAdapter implements QRTokenAdapter {
  constructor(private jwtService: JwtService) {}

  canHandle(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3;
  }

  parse(token: string): QRTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const json = Buffer.from(
        parts[1].replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf8');
      
      const decoded = JSON.parse(json);
      const now = Math.floor(Date.now() / 1000);
      
      if (decoded && decoded.sessionId && decoded.exp && decoded.exp >= now) {
        return decoded as QRTokenPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * QR Token Adapter Manager - Facade cho việc chọn adapter phù hợp
 */
@Injectable()
export class QRTokenAdapterManager {
  private adapters: QRTokenAdapter[];

  constructor(
    jwtTokenAdapter: JWTTokenAdapter,
    jsonTokenAdapter: JSONTokenAdapter,
    rawJWTPayloadAdapter: RawJWTPayloadAdapter,
  ) {
    // Thứ tự ưu tiên: JWT -> JSON -> Raw
    this.adapters = [jwtTokenAdapter, jsonTokenAdapter, rawJWTPayloadAdapter];
  }

  /**
   * Parse token với tất cả các adapter theo thứ tự ưu tiên
   */
  parse(token: string): QRTokenPayload {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(token)) {
        const result = adapter.parse(token);
        if (result) {
          return result;
        }
      }
    }
    
    throw new BadRequestException('QR token không hợp lệ hoặc đã hết hạn');
  }

  /**
   * Thêm adapter mới vào cuối danh sách
   */
  addAdapter(adapter: QRTokenAdapter): void {
    this.adapters.push(adapter);
  }
}

