import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
  async create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
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
}
