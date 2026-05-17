import { ForbiddenRpcException, UserAlreadyExistsException, UserNotFoundException } from "@challenge/exceptions";
import type {
  AdminCreateUserRpcPayload,
  AdminDeleteUserRpcPayload,
  AdminUpdateRoleRpcPayload,
  GetWorkerProfileRpcPayload,
  PatchWorkerProfileRpcPayload,
} from "@challenge/types";
import {
  PaginationQueryDto,
  PaginationResultDto,
  PatchWorkerProfileDto,
  RegisterAuthPayload,
  ResponseUserDto,
  UpdateUserDto,
  UserRole,
  WorkerSpecialization,
} from "@challenge/types";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { In, Repository } from "typeorm";
import { User } from "./entity/user.entity";

const WORKER_SPECIALIZATIONS = new Set<string>(Object.values(WorkerSpecialization));

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject("NOTIFICATION_SERVICE") private readonly notificationClient: ClientProxy,
  ) { }

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

  private iso(d: Date): string {
    return d instanceof Date ? d.toISOString() : String(d);
  }

  private normalizeSkillsArray(inp: string[]): string[] | null {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of inp) {
      const x = typeof raw === "string" ? raw.trim() : "";
      if (!x.length || seen.has(x)) continue;
      seen.add(x);
      out.push(x);
      if (out.length >= 48) break;
    }
    return out.length ? out : [];
  }

  private assertAvatarData(data: string) {
    if (!data.startsWith("data:image/")) {
      throw new ForbiddenRpcException();
    }
    if (data.length > 131072) {
      throw new ForbiddenRpcException();
    }
    const head = /^data:image\/(jpeg|png);base64,/.exec(data);
    if (!head) {
      throw new ForbiddenRpcException();
    }
    const payload = data.slice(head[0].length);
    const approxBytes = Math.floor((payload.length * 3) / 4);
    if (approxBytes > 98304) {
      throw new ForbiddenRpcException();
    }
  }

  toResponseDto(user: User): ResponseUserDto {
    const skillsRaw = user.skills;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName ?? null,
      specialization: user.specialization ?? null,
      bio: user.bio ?? null,
      skills: Array.isArray(skillsRaw) ? skillsRaw : skillsRaw ?? null,
      avatarData: user.avatarData ?? null,
      telegramContact: user.telegramContact ?? null,
      githubUrl: user.githubUrl ?? null,
      createdAt: this.iso(user.createdAt),
      updatedAt: this.iso(user.updatedAt),
    };
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
    const trimmed = email.trim();
    const user: User | null = await this.userRepository
      .createQueryBuilder("u")
      .where("LOWER(u.email) = LOWER(:e)", { e: trimmed })
      .getOne();
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
    const emailNorm = payload.email.trim().toLowerCase();
    const usernameTrim = payload.username.trim();
    const exists = await this.userRepository
      .createQueryBuilder("u")
      .where("LOWER(u.email) = :e", { e: emailNorm })
      .orWhere("u.username = :un", { un: usernameTrim })
      .getOne();
    if (exists) throw new UserAlreadyExistsException();
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const savedUser = await this.userRepository.save({
      username: usernameTrim,
      email: emailNorm,
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

    if (dto.refreshTokenHash !== undefined) {
      user.refreshTokenHash = dto.refreshTokenHash;
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
    });
    return users.map((u) => this.toResponseDto(u));
  }

  async getAllSimple(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find({
      order: { username: "ASC" },
    });
    return users.map((u) => this.toResponseDto(u));
  }

  async getDtoForSelf(userId: string): Promise<ResponseUserDto> {
    const user = await this.getById(userId);
    return this.toResponseDto(user);
  }

  async listWorkersDirectory(requesterUserId: string): Promise<ResponseUserDto[]> {
    await this.getById(requesterUserId);
    const users = await this.userRepository.find({
      where: { role: UserRole.USER },
      order: { username: "ASC" },
    });
    return users.map((u) => this.toResponseDto(u));
  }

  async getProfileForViewer(payload: GetWorkerProfileRpcPayload): Promise<ResponseUserDto> {
    const requester = await this.getById(payload.requesterUserId);
    const target = await this.getById(payload.targetUserId);
    if (target.id === requester.id) {
      return this.toResponseDto(target);
    }
    if (target.role === UserRole.ADMIN && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenRpcException();
    }
    return this.toResponseDto(target);
  }

  async patchProfile(payload: PatchWorkerProfileRpcPayload): Promise<ResponseUserDto> {
    const requester = await this.getById(payload.requesterUserId);
    let target = requester;

    const targetIdHint = payload.targetUserId ?? requester.id;
    if (targetIdHint !== requester.id) {
      if (requester.role !== UserRole.ADMIN) {
        throw new ForbiddenRpcException();
      }
      const other = await this.getById(targetIdHint);
      if (other.role !== UserRole.USER) {
        throw new ForbiddenRpcException();
      }
      target = other;
    }

    const body = payload.body ?? {};
    if (body.displayName !== undefined) {
      const v = body.displayName?.trim();
      target.displayName = v?.length ? v.slice(0, 120) : null;
    }
    if (body.specialization !== undefined) {
      if (body.specialization === null) {
        target.specialization = null;
      } else if (WORKER_SPECIALIZATIONS.has(body.specialization)) {
        target.specialization = body.specialization;
      } else {
        throw new ForbiddenRpcException();
      }
    }
    if (body.bio !== undefined) {
      const v = body.bio ?? "";
      target.bio = v.trim().length ? v.trim().slice(0, 2000) : null;
    }
    if (body.skills !== undefined) {
      target.skills =
        body.skills === null ? null : this.normalizeSkillsArray(body.skills ?? []);
    }
    if (body.telegramContact !== undefined) {
      const v = body.telegramContact?.trim();
      target.telegramContact = v?.length ? v.slice(0, 200) : null;
    }
    if (body.githubUrl !== undefined) {
      const v = body.githubUrl?.trim();
      target.githubUrl = v?.length ? v.slice(0, 500) : null;
    }
    if (body.clearAvatar) {
      target.avatarData = null;
    }
    if (body.avatarData !== undefined && body.avatarData !== null) {
      this.assertAvatarData(body.avatarData);
      target.avatarData = body.avatarData;
    }

    const saved = await this.userRepository.save(target);

    try {
      this.notificationClient.emit("user.profile.updated", { userId: saved.id });
    } catch {
    }

    return this.toResponseDto(saved);
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

    const emailNorm = payload.email.trim().toLowerCase();
    const usernameTrim = payload.username.trim();
    const exists = await this.userRepository
      .createQueryBuilder("u")
      .where("LOWER(u.email) = :e", { e: emailNorm })
      .orWhere("u.username = :un", { un: usernameTrim })
      .getOne();
    if (exists) throw new UserAlreadyExistsException();

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const saved = await this.userRepository.save({
      username: usernameTrim,
      email: emailNorm,
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

  async adminDeleteUser(payload: AdminDeleteUserRpcPayload) {
    await this.assertRequesterIsAdmin(payload.requesterUserId);

    if (payload.requesterUserId === payload.targetUserId) {
      throw new ForbiddenRpcException();
    }

    const target = await this.getById(payload.targetUserId);

    if (target.role === UserRole.ADMIN) {
      if ((await this.countRole(UserRole.ADMIN)) <= 1) throw new ForbiddenRpcException();
    }

    await this.userRepository.delete(payload.targetUserId);
    return { ok: true as const };
  }
}
