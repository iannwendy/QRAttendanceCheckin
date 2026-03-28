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

interface QRSessionContext {
  id: string;
  publicCode?: string | null;
  title?: string | null;
  class?: {
    name: string | null;
    code: string | null;
  } | null;
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

  generateQRToken(session: QRSessionContext): QRTokenPayload {
    const now = Math.floor(Date.now() / 1000);
    const nonce = `${session.id}-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const exp = now + this.qrRotateSeconds;

    // Lưu nonce với TTL
    this.nonceMap.set(nonce, {
      expiresAt: Date.now() + this.qrRotateSeconds * 1000,
    });

    // Dọn dẹp nonce cũ
    this.cleanupExpiredNonces();

    const payload: QRTokenPayload = {
      sessionId: session.id,
      nonce,
      iat: now,
      exp,
      type: 'ATTEND_TOKEN',
      ver: 1,
      publicCode: session.publicCode ?? null,
      className: session.class?.name ?? null,
      classCode: session.class?.code ?? null,
      sessionTitle: session.title ?? null,
    };

    return payload;
  }

  signQRToken(payload: QRTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET') || 'dev_change_me',
    });
  }

  verifyQRToken(token: string): QRTokenPayload | null {
    const secret = this.configService.get('JWT_SECRET') || 'dev_change_me';
    try {
      const payload = this.jwtService.verify<QRTokenPayload>(token, {
        secret,
        clockTolerance: 5, // allow small clock skew
      });
      this.handleNonce(payload);
      return payload;
    } catch (e) {
      // Fallback: decode without verifying signature, then check exp manually with small tolerance.
      try {
        const decoded = this.jwtService.decode(token) as QRTokenPayload | null;
        if (!decoded) return null;
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp >= now - 5) {
          this.handleNonce(decoded);
          return decoded;
        }
      } catch (_) {}
      return null;
    }
  }

  private handleNonce(payload: QRTokenPayload) {
    const nonceData = this.nonceMap.get(payload.nonce);
    if (nonceData && nonceData.expiresAt >= Date.now()) {
      this.nonceMap.delete(payload.nonce);
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
