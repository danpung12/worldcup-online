import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'generated/prisma/client';

export const GetUser = createParamDecorator(
  (data: keyof User, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    const user = req.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
