import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminJwtGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const authedUser = super.handleRequest(err, user, info, context);
    if (authedUser.role !== 'admin') {
      throw new ForbiddenException('Requiere rol de administrador');
    }
    return authedUser;
  }
}
