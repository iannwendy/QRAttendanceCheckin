import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const username = loginDto.username || loginDto.email || '';
    return this.authService.login(username, loginDto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      studentCode: user.studentCode,
      role: user.role,
    };
  }
}
