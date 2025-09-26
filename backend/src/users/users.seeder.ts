import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

@Injectable()
export class UsersSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeeder.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const username =
      this.configService.get<string>('ADMIN_USERNAME') ||
      'admin@agentvoiceresponse.com';
    const password =
      this.configService.get<string>('ADMIN_PASSWORD') || 'agentvoiceresponse';

    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      return;
    }

    await this.usersService.create({
      username,
      password,
      role: UserRole.ADMIN,
    });

    this.logger.log(`Created default admin user '${username}'`);
  }
}
