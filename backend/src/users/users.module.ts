import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserPrototypeManager } from './prototypes/user.prototype';

@Module({
  providers: [UsersService, UserPrototypeManager],
  exports: [UsersService, UserPrototypeManager],
})
export class UsersModule {}
