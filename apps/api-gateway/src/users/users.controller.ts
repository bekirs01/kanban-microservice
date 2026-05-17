import { Controller, ForbiddenException, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { isBoardElevated, normalizeRequesterRole } from '../common/rbac';

@ApiTags('users')
@ApiBearerAuth()
@Controller('/users')
export class UsersController {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) { }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiOperation({ summary: 'Batch buscar usuários por IDs' })
  @ApiQuery({ name: 'ids', required: true, description: 'Lista de IDs separada por vírgula' })
  @ApiResponse({ status: 200, description: 'Usuários retornados.' })
  async getManyByIds(@Req() req: any, @Query('ids') idsParam: string) {
    const role = normalizeRequesterRole(req.user?.role);

    const ids = (idsParam ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!ids.length) {
      if (!isBoardElevated(role)) throw new ForbiddenException();
      return this.authClient.send('users.getAll', {});
    }
    return this.authClient.send('users.getManyByIds', { ids });
  }
}
