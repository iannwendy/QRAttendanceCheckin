/**
 * STRATEGY PATTERN - Authentication Strategy
 * 
 * Bối cảnh: Hệ thống hỗ trợ nhiều loại đăng nhập:
 * 1. ADMIN: Đăng nhập admin
 * 2. LECTURER: Đăng nhập giảng viên  
 * 3. STUDENT: Đăng nhập bằng MSSV
 * 
 * Strategy pattern cho phép dễ dàng thêm/sửa/loại bỏ các strategy đăng nhập
 * mà không ảnh hưởng đến code hiện tại
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

export interface AuthResult {
  user: any;
  userType: 'ADMIN' | 'LECTURER' | 'STUDENT';
}

/**
 * Interface cho các Authentication Strategy
 */
export interface AuthStrategy {
  /**
   * Tên strategy
   */
  getName(): string;

  /**
   * Kiểm tra xem strategy này có thể xử lý request không
   */
  canHandle(username: string): boolean;

  /**
   * Thực hiện xác thực
   */
  authenticate(username: string): Promise<AuthResult>;
}

/**
 * Admin Authentication Strategy
 */
@Injectable()
export class AdminAuthStrategy implements AuthStrategy {
  constructor(private usersService: UsersService) {}

  getName(): string {
    return 'AdminAuthStrategy';
  }

  canHandle(username: string): boolean {
    return username.trim().toLowerCase() === 'admin';
  }

  async authenticate(username: string): Promise<AuthResult> {
    const user = await this.usersService.findByRole('ADMIN');
    if (!user) {
      throw new UnauthorizedException('Tài khoản admin không tồn tại');
    }
    return { user, userType: 'ADMIN' };
  }
}

/**
 * Lecturer Authentication Strategy
 */
@Injectable()
export class LecturerAuthStrategy implements AuthStrategy {
  constructor(private usersService: UsersService) {}

  getName(): string {
    return 'LecturerAuthStrategy';
  }

  canHandle(username: string): boolean {
    return username.trim().toLowerCase() === 'lecturer';
  }

  async authenticate(username: string): Promise<AuthResult> {
    const user = await this.usersService.findByRole('LECTURER');
    if (!user) {
      throw new UnauthorizedException('Tài khoản giảng viên không tồn tại');
    }
    return { user, userType: 'LECTURER' };
  }
}

/**
 * Student Authentication Strategy (by MSSV)
 */
@Injectable()
export class StudentAuthStrategy implements AuthStrategy {
  constructor(private usersService: UsersService) {}

  getName(): string {
    return 'StudentAuthStrategy';
  }

  canHandle(username: string): boolean {
    // MSSV format: 523Hxxxx
    const trimmed = username.trim().toUpperCase();
    return /^523H\d{4}$/.test(trimmed);
  }

  async authenticate(username: string): Promise<AuthResult> {
    const studentCode = username.trim().toUpperCase();
    const user = await this.usersService.findByStudentCode(studentCode);
    if (!user) {
      throw new UnauthorizedException('Sinh viên không tồn tại');
    }
    return { user, userType: 'STUDENT' };
  }
}

/**
 * Authentication Context - Quản lý các strategy
 */
@Injectable()
export class AuthStrategyContext {
  private strategies: AuthStrategy[] = [];

  constructor(
    adminStrategy: AdminAuthStrategy,
    lecturerStrategy: LecturerAuthStrategy,
    studentStrategy: StudentAuthStrategy,
  ) {
    // Thứ tự ưu tiên: Admin -> Lecturer -> Student
    this.strategies = [adminStrategy, lecturerStrategy, studentStrategy];
  }

  /**
   * Thêm strategy mới
   */
  addStrategy(strategy: AuthStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Thực hiện authentication với strategy phù hợp
   */
  async authenticate(username: string): Promise<AuthResult> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(username)) {
        return strategy.authenticate(username);
      }
    }
    
    // Fallback: thử là MSSV
    const studentStrategy = this.strategies.find(s => s instanceof StudentAuthStrategy);
    if (studentStrategy) {
      return studentStrategy.authenticate(username);
    }
    
    throw new UnauthorizedException('Không tìm thấy strategy phù hợp');
  }
}

