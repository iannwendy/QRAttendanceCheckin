/**
 * PROTOTYPE PATTERN - User Prototype for Batch Creation
 * 
 * Bối cảnh: Hệ thống cần tạo nhiều user sinh viên mẫu (100 sinh viên)
 * với các thuộc tính tương tự nhau nhưng khác nhau về studentCode.
 * 
 * Prototype pattern cho phép clone một object mẫu và customize các thuộc tính unique
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface UserPrototype {
  email: string;
  passwordHash: string;
  fullName: string;
  studentCode: string;
  role: 'STUDENT';
}

/**
 * Prototype Manager - Quản lý các prototype user
 */
@Injectable()
export class UserPrototypeManager {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo student prototype với các giá trị mặc định
   */
  createStudentPrototype(): UserPrototype {
    return {
      email: '',           // Sẽ được customize
      passwordHash: '',   // Mặc định rỗng
      fullName: '',       // Sẽ được customize
      studentCode: '',   // Sẽ được customize
      role: 'STUDENT',
    };
  }

  /**
   * Clone prototype và điền thông tin cụ thể
   */
  cloneStudentPrototype(
    prototype: UserPrototype,
    studentCode: string,
    fullName?: string,
  ): UserPrototype {
    return {
      ...prototype,
      email: `${studentCode.toLowerCase()}@example.edu`,
      fullName: fullName || `Sinh viên ${studentCode}`,
      studentCode,
    };
  }

  /**
   * Tạo hàng loạt sinh viên từ danh sách mã
   * Sử dụng Prototype pattern để tránh khởi tạo object mới cho mỗi sinh viên
   */
  async createBatchStudents(studentCodes: string[]): Promise<number> {
    const prototype = this.createStudentPrototype();
    
    // Clone và chuẩn bị dữ liệu
    const userData = studentCodes.map(code => 
      this.cloneStudentPrototype(prototype, code)
    );

    // Batch create
    await this.prisma.user.createMany({
      data: userData,
      skipDuplicates: true,
    });

    return userData.length;
  }

  /**
   * Demo: Tạo 100 sinh viên mẫu (523H0001 - 523H0100)
   */
  async createDemoStudents(): Promise<number> {
    const toPadded = (n: number) => n.toString().padStart(4, '0');
    const studentCodes = Array.from(
      { length: 100 },
      (_, i) => `523H${toPadded(i + 1)}`,
    );

    return this.createBatchStudents(studentCodes);
  }
}

