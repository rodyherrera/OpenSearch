import { createParamDecorator } from '@/shared/controllers/params';
import type { Principal } from '@/modules/auth/contracts/domain/auth';

export const CurrentPrincipal = (): ParameterDecorator =>
    createParamDecorator((req) => req.principal as Principal);
