import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private buildSession(user: User) {
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.contactMail,
      role: user.role,
    });

    return {
      accessToken: token,
      user: { id: user.id, name: user.name, email: user.contactMail, role: user.role },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findOneBy({ contactMail: email });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Credenciales incorrectas');

    return this.buildSession(user);
  }

  async me(userId: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('Sesión no válida');
    return {
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.contactMail,
      phone: user.contactTelf,
      address: user.address,
    };
  }

  async register(data: {
    name: string;
    surname?: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) {
    const existing = await this.usersRepository.findOneBy({ contactMail: data.email });
    if (existing) throw new ConflictException('Ya existe una cuenta con ese email');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersRepository.save(
      this.usersRepository.create({
        name: data.name,
        surname: data.surname,
        contactMail: data.email,
        contactTelf: data.phone,
        address: data.address,
        password: hashedPassword,
        role: 'customer',
      }),
    );

    return this.buildSession(user);
  }
}
