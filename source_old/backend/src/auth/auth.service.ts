import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    // Dev rule: tất cả mật khẩu phải là 'pass123'
    if (password !== 'pass123') {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    let user = null as any;
    const lower = (username || '').trim().toLowerCase();
    if (lower === 'admin') {
      user = await this.usersService.findByRole('ADMIN');
    } else if (lower === 'lecturer') {
      user = await this.usersService.findByRole('LECTURER');
    } else {
      // Assume MSSV
      const code = username.trim().toUpperCase();
      user = await this.usersService.findByStudentCode(code);
    }
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

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
