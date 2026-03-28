import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthStrategyContext, AuthResult } from './strategies/auth-strategy';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private authStrategyContext: AuthStrategyContext,
  ) {}

  async login(username: string, password: string) {
    // Dev rule: tất cả mật khẩu phải là 'pass123'
    if (password !== 'pass123') {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    // Use Strategy Pattern to authenticate
    let authResult: AuthResult;
    try {
      authResult = await this.authStrategyContext.authenticate(username);
    } catch (error) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    if (!authResult || !authResult.user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    const { user, userType } = authResult;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentCode: user.studentCode,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
