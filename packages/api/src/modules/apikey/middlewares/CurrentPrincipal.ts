import { createParamDecorator } from '@/shared/controllers/params';
import type { Principal } from '@/modules/auth/contracts/domain/auth';

// Injects the verified principal set by PublicApiRoute (API key or JWT identity).
export const CurrentPrincipal = (): ParameterDecorator =>
    createParamDecorator((req) => req.principal as Principal);
