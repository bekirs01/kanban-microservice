import { UserAlreadyExistsException, UserNotFoundException } from "@challenge/exceptions";
import type {
  AdminListRegistrationsRpcPayload,
  AdminRegistrationDecisionRpcPayload,
  ListedPendingRegistrationDto,
  RegistrationPendingNotificationPayload,
  SubmitRegistrationRpcPayload,
} from "@challenge/types";
import { UserRole } from "@challenge/types";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { RegistrationRequest } from "./entity/registration-request.entity";
import { User } from "./entity/user.entity";
import { UserService } from "./user.service";

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(RegistrationRequest)
    private readonly regRepo: Repository<RegistrationRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userService: UserService,
    @Inject("NOTIFICATION_SERVICE") private readonly notificationClient: ClientProxy,
  ) { }

  private normalizeRequestedRole(role: SubmitRegistrationRpcPayload["requestedRole"]): UserRole.USER | UserRole.MANAGER {
    return role === UserRole.MANAGER ? UserRole.MANAGER : UserRole.USER;
  }

  async submit(payload: SubmitRegistrationRpcPayload): Promise<{ requestId: string }> {
    const username = payload.username.trim();
    const email = payload.email.trim().toLowerCase();
    const requestedRole = this.normalizeRequestedRole(payload.requestedRole);

    if (!username.length || !email.length) {
      throw new UserAlreadyExistsException();
    }

    const existingAccount = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existingAccount) {
      throw new UserAlreadyExistsException();
    }

    const pendingSame = await this.regRepo.findOne({
      where: { status: "pending", email },
    });
    if (pendingSame) {
      throw new UserAlreadyExistsException();
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const saved = await this.regRepo.save(
      this.regRepo.create({
        username,
        email,
        passwordHash,
        requestedRole,
        status: "pending",
      }),
    );

    const admins = await this.userRepo.find({
      where: { role: UserRole.ADMIN },
      select: ["id"],
    });
    const adminUserIds = admins.map((a) => a.id);

    if (adminUserIds.length) {
      const notificationPayload: RegistrationPendingNotificationPayload = {
        adminUserIds,
        applicantUsername: username,
        applicantEmail: email,
        requestedRole,
        requestId: saved.id,
      };
      this.notificationClient.emit("registration.pending", notificationPayload);
    }

    return { requestId: saved.id };
  }

  async listPendingForAdmin(
    payload: AdminListRegistrationsRpcPayload,
  ): Promise<ListedPendingRegistrationDto[]> {
    await this.userService.assertRequesterIsAdmin(payload.requesterUserId);
    const rows = await this.regRepo.find({
      where: { status: "pending" },
      order: { createdAt: "DESC" },
    });
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      requestedRole: r.requestedRole,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  async approve(payload: AdminRegistrationDecisionRpcPayload): Promise<void> {
    await this.userService.assertRequesterIsAdmin(payload.requesterUserId);
    const pending = await this.regRepo.findOne({
      where: { id: payload.requestId, status: "pending" },
    });
    if (!pending) {
      throw new UserNotFoundException();
    }

    const existsAccount = await this.userRepo.findOne({
      where: [{ email: pending.email }, { username: pending.username }],
    });
    if (existsAccount) {
      throw new UserAlreadyExistsException();
    }

    const role = this.normalizeRequestedRole(pending.requestedRole as UserRole.USER | UserRole.MANAGER);

    await this.regRepo.manager.transaction(async (trx) => {
      const uRepo = trx.getRepository(User);
      const rRepo = trx.getRepository(RegistrationRequest);

      await uRepo.save(
        uRepo.create({
          username: pending.username,
          email: pending.email,
          passwordHash: pending.passwordHash,
          role,
        }),
      );

      await rRepo.delete({ id: pending.id });
    });
  }

  async reject(payload: AdminRegistrationDecisionRpcPayload): Promise<void> {
    await this.userService.assertRequesterIsAdmin(payload.requesterUserId);
    const pending = await this.regRepo.findOne({
      where: { id: payload.requestId, status: "pending" },
    });
    if (!pending) {
      throw new UserNotFoundException();
    }

    await this.regRepo.delete({ id: pending.id });
  }
}
