import { UserRole } from '../../users/user.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}
