import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UsersAdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepository.find({ order: { id: 'ASC' } });
  }

  create(data: Partial<User>) {
    return this.usersRepository.save(this.usersRepository.create(data));
  }

  async update(id: number, data: Partial<User>) {
    await this.usersRepository.save({ id, ...data });
    return this.usersRepository.findOneBy({ id });
  }

  remove(id: number) {
    return this.usersRepository.delete(id);
  }
}
