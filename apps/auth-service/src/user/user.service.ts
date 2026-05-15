import { UserAlreadyExistsException, UserNotFoundException } from '@challenge/exceptions';
import { PaginationQueryDto, PaginationResultDto, RegisterAuthPayload, ResponseUserDto, UpdateUserDto } from '@challenge/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from "bcryptjs";
import { In, Repository } from 'typeorm';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {
  }

  async getByEmail(email: string): Promise<User> {
    const user: User | null = await this.userRepository.findOne({ where: { email: email } });
    if (!user) throw new UserNotFoundException();
    return user;
  }

  async getById(userId: string): Promise<User> {
    const user: User | null = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new UserNotFoundException();
    return user;
  }
  async getAll(pagination: PaginationQueryDto): Promise<PaginationResultDto<User[]>> {
    const { limit = 10, page = 1 } = pagination;

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await this.userRepository.findAndCount({
      skip,
      take: limit,
    });

    return {
      items: users,
      data: {
        totalItems: totalUsers,
        itemCount: users.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
      },
    };
  }

  async create(payload: RegisterAuthPayload): Promise<User> {
    const exists = await this.userRepository.findOne({ where: [{ email: payload.email }, { username: payload.username }] })
    if (exists) throw new UserAlreadyExistsException();
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const savedUser = await this.userRepository.save({ username: payload.username, email: payload.email, passwordHash: hashedPassword });
    return savedUser;
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepository.preload({
      id: userId,
      ...dto,
    });

    if (!user) throw new UserNotFoundException();

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.refreshTokenHash) {
      user.refreshTokenHash = await bcrypt.hash(dto.refreshTokenHash, 10);
    }

    const savedUser = await this.userRepository.save(user);
    return savedUser;
  }

  async logout(userId: string) {
    const user = await this.userRepository.preload({
      id: userId
    });

    if (!user) throw new UserNotFoundException();

    const savedUser = await this.userRepository.save({ ...user, refreshTokenHash: "" });
    return savedUser;
  }

  async getManyByIds(ids: string[]): Promise<ResponseUserDto[]> {
    if (!ids?.length) return [];
    const users = await this.userRepository.find({
      where: { id: In(ids) },
      select: ['id', 'username', 'email'],
    });
    return users as ResponseUserDto[];
  }

  async getAllSimple(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find({
      select: ['id', 'username', 'email'],
    });
    return users as ResponseUserDto[];
  }
}
