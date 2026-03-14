import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  UserPrototype,
  UserPrototypeManager,
} from './prototypes/user.prototype';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private userPrototypeManager: UserPrototypeManager,
  ) {}

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

  async createUserFromPrototype(
    template: UserPrototype,
    email: string,
    fullName: string,
    studentCode = '',
  ) {
    const user = template
      .clone()
      .withEmail(email)
      .withFullName(fullName)
      .withStudentCode(studentCode);

    return this.prisma.user.create({
      data: user.toPrismaCreateInput() as Prisma.UserCreateInput,
    });
  }

  async createDemoDataFromPrototype() {
    const createdStudents = await this.userPrototypeManager.createDemoStudents();

    return {
      createdStudents,
    };
  }
}
