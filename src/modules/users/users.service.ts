import { Injectable } from '@nestjs/common';
import { CreateUserDTO } from './dto/create-user.dto';
import { User } from 'generated/prisma/client';
import { UpdateUserDTO } from './dto/update-user-dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const roundsOfHashing = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDTO): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, roundsOfHashing);

    data.password = hashedPassword;

    return this.prisma.user.create({
      data,
    });
  }

  async findOne(email: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user!;
  }

  async update(id: string, updateUserDto: UpdateUserDTO) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        roundsOfHashing,
      );
    }
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
