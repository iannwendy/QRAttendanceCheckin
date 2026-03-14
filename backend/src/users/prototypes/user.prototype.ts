import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface Cloneable<T> {
  clone(): T;
}

export class UserPrototype implements Cloneable<UserPrototype> {
  email: string;
  passwordHash: string;
  fullName: string;
  studentCode: string;
  role: Role;

  constructor() {
    this.email = '';
    this.passwordHash = '';
    this.fullName = '';
    this.studentCode = '';
    this.role = Role.STUDENT;
  }

  clone(): UserPrototype {
    return Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    );
  }

  withEmail(email: string): UserPrototype {
    const next = this.clone();
    next.email = email;
    return next;
  }

  withFullName(fullName: string): UserPrototype {
    const next = this.clone();
    next.fullName = fullName;
    return next;
  }

  withStudentCode(studentCode: string): UserPrototype {
    const next = this.clone();
    next.studentCode = studentCode;
    return next;
  }

  withPasswordHash(passwordHash: string): UserPrototype {
    const next = this.clone();
    next.passwordHash = passwordHash;
    return next;
  }

  withRole(role: Role): UserPrototype {
    const next = this.clone();
    next.role = role;
    return next;
  }

  static studentTemplate(): UserPrototype {
    return new UserPrototype()
      .withRole(Role.STUDENT)
      .withPasswordHash('');
  }

  static lecturerTemplate(): UserPrototype {
    return new UserPrototype()
      .withRole(Role.LECTURER)
      .withPasswordHash('');
  }

  static adminTemplate(): UserPrototype {
    return new UserPrototype()
      .withRole(Role.ADMIN)
      .withPasswordHash('');
  }

  toPrismaCreateInput(): Prisma.UserCreateManyInput {
    return {
      email: this.email,
      passwordHash: this.passwordHash,
      fullName: this.fullName,
      studentCode: this.studentCode,
      role: this.role,
    };
  }
}

@Injectable()
export class UserPrototypeManager {
  constructor(private readonly prisma: PrismaService) {}

  async createBatchStudents(studentCodes: string[]): Promise<number> {
    const template = UserPrototype.studentTemplate();

    const userData = studentCodes.map((studentCode) =>
      template
        .withEmail(`${studentCode.toLowerCase()}@example.edu`)
        .withFullName(`Sinh viên ${studentCode}`)
        .withStudentCode(studentCode)
        .toPrismaCreateInput(),
    );

    await this.prisma.user.createMany({
      data: userData,
      skipDuplicates: true,
    });

    return userData.length;
  }

  async createDemoStudents(): Promise<number> {
    const toPadded = (n: number) => n.toString().padStart(4, '0');
    const studentCodes = Array.from(
      { length: 100 },
      (_, i) => `523H${toPadded(i + 1)}`,
    );

    return this.createBatchStudents(studentCodes);
  }
}

