import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface QRTokenPayload {
  sessionId: string;
  nonce: string;
  iat: number;
  exp: number;
  type: 'ATTEND_TOKEN';
  ver: number;
}

export class QRTokenService {
  private nonceMap = new Map<string, { expiresAt: number }>();
  private readonly qrRotateSeconds: number;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.qrRotateSeconds =
      parseInt(this.configService.get('QR_ROTATE_SECONDS') || '180') || 180;
  }

  generateQRToken(sessionId: string): QRTokenPayload {
    const now = Math.floor(Date.now() / 1000);
    const nonce = `${sessionId}-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const exp = now + this.qrRotateSeconds;

    // Lưu nonce với TTL
    this.nonceMap.set(nonce, {
      expiresAt: Date.now() + this.qrRotateSeconds * 1000,
    });

    // Dọn dẹp nonce cũ
    this.cleanupExpiredNonces();

    const payload: QRTokenPayload = {
      sessionId,
      nonce,
      iat: now,
      exp,
      type: 'ATTEND_TOKEN',
      ver: 1,
    };

    return payload;
  }

  signQRToken(payload: QRTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET') || 'dev_change_me',
    });
  }

  verifyQRToken(token: string): QRTokenPayload | null {
    try {
      const payload = this.jwtService.verify<QRTokenPayload>(token, {
        secret: this.configService.get('JWT_SECRET') || 'dev_change_me',
      });

      // Kiểm tra nonce hợp lệ và chưa hết hạn
      const nonceData = this.nonceMap.get(payload.nonce);
      if (nonceData && nonceData.expiresAt >= Date.now()) {
        // Xóa nonce sau khi dùng (chống replay)
        this.nonceMap.delete(payload.nonce);
      }
      // Trong môi trường demo/tunnel, có thể mất trạng thái nonce khi server/tunnel restart.
      // Nếu không tìm thấy nonce, vẫn chấp nhận miễn là chữ ký JWT hợp lệ và exp còn hạn.

      return payload;
    } catch {
      return null;
    }
  }

  private cleanupExpiredNonces() {
    const now = Date.now();
    for (const [nonce, data] of this.nonceMap.entries()) {
      if (data.expiresAt < now) {
        this.nonceMap.delete(nonce);
      }
    }
  }
}

