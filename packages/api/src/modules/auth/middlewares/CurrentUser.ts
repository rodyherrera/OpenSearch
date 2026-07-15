import { createParamDecorator } from '@/shared/controllers/params';

export const CurrentUser = (): ParameterDecorator =>
    createParamDecorator((req) => (req as any).principal?.userId as string);
