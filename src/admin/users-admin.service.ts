import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UsersAdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepository.find({
      order: { id: 'ASC' },
      select: { id: true, name: true, surname: true, contactMail: true, contactTelf: true, address: true, role: true },
    });
  }

  async create(data: Partial<User>) {
    const hashedPassword = await bcrypt.hash(data.password ?? '', 10);
    return this.usersRepository.save(
      this.usersRepository.create({ ...data, password: hashedPassword }),
    );
  }

  async update(id: number, data: Partial<User>) {
    const update: Partial<User> = { ...data };
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    } else {
      delete update.password;
    }
    await this.usersRepository.save({ id, ...update });
    return this.usersRepository.findOne({
      where: { id },
      select: { id: true, name: true, surname: true, contactMail: true, contactTelf: true, address: true, role: true },
    });
  }

  remove(id: number) {
    return this.usersRepository.delete(id);
  }
}
