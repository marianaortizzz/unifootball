import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  listUsers(
    role?: UserRole,
  ): Promise<Pick<User, 'id' | 'name' | 'email' | 'role'>[]> {
    return this.userRepo.find({
      select: { id: true, name: true, email: true, role: true },
      where: role ? { role } : {},
      order: { name: 'ASC' },
    });
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: dto.email,
      name: dto.name,
      password: passwordHash,
      role: dto.role ?? UserRole.PLAYER,
    });
    const saved = await this.userRepo.save(user);

    return this.buildResponse(saved);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildResponse(user);
  }

  private buildResponse(user: User): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
