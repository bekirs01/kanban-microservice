import { ForbiddenRpcException, UserAlreadyExistsException, UserNotFoundException } from "@challenge/exceptions";
import type { AdminCreateUserRpcPayload, AdminUpdateRoleRpcPayload } from "@challenge/types";
import { PaginationQueryDto, PaginationResultDto, RegisterAuthPayload, ResponseUserDto, UpdateUserDto, UserRole } from "@challenge/types";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { In, Repository } from "typeorm";
import { User } from "./entity/user.entity";

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {
  }

  private getPrivilegedEmails(): Set<string> {
    const bundled = [
      process.env.ADMIN_EMAILS,
      process.env.BOOTSTRAP_ADMIN_EMAIL,
    ]
      .filter(Boolean)
      .join(",");
    const set = new Set<string>();
    for (const segment of bundled.split(/[,;\s]+/)) {
      const trimmed = segment.trim().toLowerCase();
      if (trimmed.length) set.add(trimmed);
    }
    return set;
  }

  private async countRole(role: UserRole): Promise<number> {
    return this.userRepository.count({ where: { role } });
  }

  async promoteBootstrapIfNeeded(user: User): Promise<User> {
    const email = user.email.trim().toLowerCase();
    const privileged = this.getPrivilegedEmails();
    let nextRole = user.role;

    if (privileged.has(email)) {
      nextRole = UserRole.ADMIN;
    } else if ((await this.countRole(UserRole.ADMIN)) === 0) {
      nextRole = UserRole.ADMIN;
    }

    if (nextRole !== user.role) {
      user.role = nextRole;
      await this.userRepository.save(user);
    }
    return user;
  }

  async getByEmail(email: string): Promise<User> {
    const user: User | null = await this.userRepository.findOne({ where: { email: email } });
    if (!user) throw new UserNotFoundException();
    return user;
  }

  async getById(userId: string): Promise<User> {
    const user: User | null = await this.userRepository.findOne({ where: { id: userId } });
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
    const exists = await this.userRepository.findOne({
      where: [{ email: payload.email }, { username: payload.username }],
    });
    if (exists) throw new UserAlreadyExistsException();
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const savedUser = await this.userRepository.save({
      username: payload.username,
      email: payload.email,
      passwordHash: hashedPassword,
      role: UserRole.USER,
    });
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

    return this.userRepository.save(user);
  }

  async logout(userId: string) {
    const user = await this.userRepository.preload({
      id: userId,
    });

    if (!user) throw new UserNotFoundException();

    return this.userRepository.save({ ...user, refreshTokenHash: "" });
  }

  async getManyByIds(ids: string[]): Promise<ResponseUserDto[]> {
    if (!ids?.length) return [];
    const users = await this.userRepository.find({
      where: { id: In(ids) },
      select: ["id", "username", "email", "role"],
    });
    return users as ResponseUserDto[];
  }

  async getAllSimple(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find({
      select: ["id", "username", "email", "role"],
    });
    return users as ResponseUserDto[];
  }

  async assertRequesterIsAdmin(requesterUserId: string): Promise<void> {
    const requester = await this.getById(requesterUserId);
    if (requester.role !== UserRole.ADMIN) throw new ForbiddenRpcException();
  }

  async adminList(requesterUserId: string): Promise<
    Array<{
      id: string;
      username: string;
      email: string;
      role: UserRole;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    await this.assertRequesterIsAdmin(requesterUserId);

    const users = await this.userRepository.find({
      select: ["id", "username", "email", "role", "createdAt", "updatedAt"],
      order: { createdAt: "ASC" },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async adminCreateUser(payload: AdminCreateUserRpcPayload) {
    await this.assertRequesterIsAdmin(payload.requesterUserId);

    const exists = await this.userRepository.findOne({
      where: [{ email: payload.email }, { username: payload.username }],
    });
    if (exists) throw new UserAlreadyExistsException();

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const saved = await this.userRepository.save({
      username: payload.username,
      email: payload.email,
      passwordHash: hashedPassword,
      role: payload.role,
    });

    return {
      id: saved.id,
      username: saved.username,
      email: saved.email,
      role: saved.role,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async adminPatchRole(payload: AdminUpdateRoleRpcPayload) {
    await this.assertRequesterIsAdmin(payload.requesterUserId);

    const target = await this.getById(payload.targetUserId);

    if (target.role === UserRole.ADMIN && payload.role !== UserRole.ADMIN) {
      if ((await this.countRole(UserRole.ADMIN)) <= 1) throw new ForbiddenRpcException();
    }

    await this.userRepository.update(target.id, { role: payload.role });
    const updated = await this.getById(target.id);

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
