import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.class.findMany({
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            publicCode: true,
            title: true,
            startTime: true,
            endTime: true,
          } as Record<string, true>,
        },
        _count: {
          select: {
            students: true,
          },
        },
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(createClassDto: CreateClassDto, creator?: { id: string; role: Role }) {
    const data: any = {
      code: createClassDto.code,
      name: createClassDto.name,
    };

    const lecturerId =
      creator?.role === Role.LECTURER
        ? creator.id
        : createClassDto.lecturerId;

    if (lecturerId) {
      data.lecturer = {
        connect: { id: lecturerId },
      };
    }

    return this.prisma.class.create({
      data,
    });
  }

  async findOne(id: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                fullName: true,
                studentCode: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
        },
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Lớp không tồn tại');
    }

    return classData;
  }

  async enrollStudents(classId: string, enrollDto: EnrollStudentsDto) {
    // Verify class exists
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      throw new NotFoundException('Lớp không tồn tại');
    }

    const enrollments = [];

    if (enrollDto.studentCodes && enrollDto.studentCodes.length > 0) {
      // Enroll by student codes
      for (const studentCode of enrollDto.studentCodes) {
        const student = await this.prisma.user.findUnique({
          where: { studentCode },
        });

        if (!student) {
          throw new BadRequestException(
            `Sinh viên với MSSV ${studentCode} không tồn tại`,
          );
        }

        try {
          const enrollment = await this.prisma.enrollment.create({
            data: {
              classId,
              studentId: student.id,
            },
          });
          enrollments.push(enrollment);
        } catch (error) {
          // Skip if already enrolled
        }
      }
    }

    if (enrollDto.userIds && enrollDto.userIds.length > 0) {
      // Enroll by user IDs
      for (const userId of enrollDto.userIds) {
        try {
          const enrollment = await this.prisma.enrollment.create({
            data: {
              classId,
              studentId: userId,
            },
          });
          enrollments.push(enrollment);
        } catch (error) {
          // Skip if already enrolled
        }
      }
    }

    return enrollments;
  }

  async remove(id: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id },
    });

    if (!classData) {
      throw new NotFoundException('Lớp không tồn tại');
    }

    // Delete class (cascade will handle sessions, enrollments, attendances)
    await this.prisma.class.delete({
      where: { id },
    });

    return { message: 'Lớp học đã được xoá thành công' };
  }
}
