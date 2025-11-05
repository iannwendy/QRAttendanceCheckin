import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        role: true,
      },
    });
  }

  async findByStudentCode(studentCode: string) {
    return this.prisma.user.findUnique({
      where: { studentCode },
    });
  }

  async findByRole(role: 'ADMIN' | 'LECTURER') {
    return this.prisma.user.findFirst({
      where: { role },
    });
  }
}

