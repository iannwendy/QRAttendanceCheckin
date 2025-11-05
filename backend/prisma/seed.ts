import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Danh sách tên tiếng Việt
const vietnameseNames = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Văn Cường',
  'Phạm Thị Dung',
  'Hoàng Văn Đức',
  'Vũ Thị Hương',
  'Đỗ Văn Hùng',
  'Bùi Thị Lan',
  'Phan Văn Minh',
  'Ngô Thị Nga',
  'Đinh Văn Phong',
  'Lý Thị Quỳnh',
  'Võ Văn Sơn',
  'Dương Thị Tâm',
  'Đặng Văn Tuấn',
  'Nguyễn Thị Uyên',
  'Trần Văn Việt',
  'Lê Thị Xuân',
  'Phạm Văn Yên',
  'Hoàng Thị Anh',
  'Vũ Văn Bảo',
  'Đỗ Thị Chi',
  'Bùi Văn Dũng',
  'Phan Thị Em',
  'Ngô Văn Giang',
  'Đinh Thị Hoa',
  'Lý Văn Khánh',
  'Võ Thị Linh',
  'Dương Văn Mạnh',
  'Đặng Thị Nhung',
  'Nguyễn Văn Oanh',
  'Trần Thị Phương',
  'Lê Văn Quang',
  'Phạm Thị Sen',
  'Hoàng Văn Thành',
  'Vũ Thị Thảo',
  'Đỗ Văn Trung',
  'Bùi Thị Uyên',
  'Phan Văn Vinh',
  'Ngô Thị Yến',
  'Đinh Văn Anh',
  'Lý Thị Bảo',
  'Võ Văn Cường',
  'Dương Thị Dung',
  'Đặng Văn Đức',
  'Nguyễn Thị Hương',
  'Trần Văn Hùng',
  'Lê Thị Lan',
  'Phạm Văn Minh',
  'Hoàng Thị Nga',
  'Vũ Văn Phong',
  'Đỗ Thị Quỳnh',
  'Bùi Văn Sơn',
  'Phan Thị Tâm',
  'Ngô Văn Tuấn',
  'Đinh Thị Uyên',
  'Lý Văn Việt',
  'Võ Thị Xuân',
  'Dương Văn Yên',
  'Đặng Thị Anh',
  'Nguyễn Văn Bảo',
  'Trần Thị Chi',
  'Lê Văn Dũng',
  'Phạm Thị Em',
  'Hoàng Văn Giang',
  'Vũ Thị Hoa',
  'Đỗ Văn Khánh',
  'Bùi Thị Linh',
  'Phan Văn Mạnh',
  'Ngô Thị Nhung',
  'Đinh Văn Oanh',
  'Lý Thị Phương',
  'Võ Văn Quang',
  'Dương Thị Sen',
  'Đặng Văn Thành',
  'Nguyễn Thị Thảo',
  'Trần Văn Trung',
  'Lê Thị Uyên',
  'Phạm Văn Vinh',
  'Hoàng Thị Yến',
  'Vũ Văn An',
  'Đỗ Thị Bình',
  'Bùi Văn Cường',
  'Phan Thị Dung',
  'Ngô Văn Đức',
  'Đinh Thị Hương',
  'Lý Văn Hùng',
  'Võ Thị Lan',
  'Dương Văn Minh',
  'Đặng Thị Nga',
  'Nguyễn Văn Phong',
  'Trần Thị Quỳnh',
  'Lê Văn Sơn',
  'Phạm Thị Tâm',
  'Hoàng Văn Tuấn',
  'Vũ Thị Uyên',
  'Đỗ Văn Việt',
  'Bùi Thị Xuân',
  'Phan Văn Yên',
  'Ngô Thị Anh',
  'Đinh Văn Bảo',
  'Lý Thị Chi',
  'Võ Văn Dũng',
  'Dương Thị Em',
  'Đặng Văn Giang',
];

async function main() {
  const passwordHash = await bcrypt.hash('pass123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const lecturerPasswordHash = await bcrypt.hash('lecturer123', 10);

  // Tạo Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin System',
      role: Role.ADMIN,
    },
  });

  console.log('✅ Created admin:', admin.email);

  // Tạo Lecturer
  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@test.com' },
    update: {},
    create: {
      email: 'lecturer@test.com',
      passwordHash: lecturerPasswordHash,
      fullName: 'Giảng Viên Mẫu',
      role: Role.LECTURER,
    },
  });

  console.log('✅ Created lecturer:', lecturer.email);

  // Tạo 100 sinh viên (MSSV từ 523H0001 đến 523H0100)
  const students = [];
  for (let i = 1; i <= 100; i++) {
    const studentCode = `523H${String(i).padStart(4, '0')}`;
    const nameIndex = (i - 1) % vietnameseNames.length;
    const fullName = vietnameseNames[nameIndex];

    const student = await prisma.user.upsert({
      where: { studentCode },
      update: {},
      create: {
        email: `student${studentCode}@test.com`,
        passwordHash,
        fullName,
        studentCode,
        role: Role.STUDENT,
      },
    });

    students.push(student);
  }

  console.log(`✅ Created ${students.length} students`);

  // Tạo 1 lớp học
  const classData = await prisma.class.upsert({
    where: { code: 'INT101' },
    update: {},
    create: {
      code: 'INT101',
      name: 'Lập Trình Web',
    },
  });

  console.log('✅ Created class:', classData.code);

  // Enroll tất cả sinh viên vào lớp
  const enrollments = [];
  for (const student of students) {
    try {
      const enrollment = await prisma.enrollment.create({
        data: {
          classId: classData.id,
          studentId: student.id,
        },
      });
      enrollments.push(enrollment);
    } catch (error) {
      // Skip if already enrolled
    }
  }

  console.log(`✅ Enrolled ${enrollments.length} students to class`);

  // Tạo 2 buổi học mẫu (vị trí TDTU)
  const now = new Date();
  const session1 = await prisma.session.create({
    data: {
      classId: classData.id,
      title: 'Buổi học 1 - Giới thiệu',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Ngày mai
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 giờ
      latitude: 10.7287, // TDTU
      longitude: 106.6967,
      geofenceRadius: 100,
      otpSecret: 'JBSWY3DPEHPK3PXP', // Secret mẫu
    },
  });

  const session2 = await prisma.session.create({
    data: {
      classId: classData.id,
      title: 'Buổi học 2 - Thực hành',
      startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 ngày sau
      endTime: new Date(now.getTime() + 48 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      latitude: 10.7287,
      longitude: 106.6967,
      geofenceRadius: 100,
      otpSecret: 'MFRGG43FMZQXEZLT', // Secret mẫu
    },
  });

  console.log('✅ Created 2 sessions');

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: admin@test.com / admin123');
  console.log('Lecturer: lecturer@test.com / lecturer123');
  console.log('Students: student523H0001@test.com - student523H0100@test.com / pass123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

