import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthStrategyContext } from './strategies/auth-strategy';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private authStrategyContext: AuthStrategyContext,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async login(username: string, password: string) {
    // Dev rule: tất cả mật khẩu phải là 'pass123'
    if (password !== 'pass123') {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    // Sử dụng Strategy Pattern để xác định loại user và authenticate
    const authResult = await this.authStrategyContext.authenticate(username);
    const user = authResult.user;

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
