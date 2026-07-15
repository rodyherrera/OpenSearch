import { object, string, pipe, email, minLength, type InferOutput } from 'valibot';

export const LoginSchema = object({
    email: pipe(string(), email('Invalid email')),
    password: pipe(string(), minLength(1, 'Required'))
});

export type LoginInput = InferOutput<typeof LoginSchema>;

export interface AuthSession{
    token: string;
}

export interface SessionAdmin{
    id: string;
    email: string;
    role: 'admin';
}
