import { Controller, Post, Body, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async findAll() {
    return this.classesService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async create(@Body() createClassDto: CreateClassDto, @CurrentUser() user: any) {
    return this.classesService.create(createClassDto, user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post(':id/enroll')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async enrollStudents(
    @Param('id') id: string,
    @Body() enrollDto: EnrollStudentsDto,
  ) {
    return this.classesService.enrollStudents(id, enrollDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
