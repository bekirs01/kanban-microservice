import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@challenge/types';

export const ROLES_KEY = 'rbac_roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
