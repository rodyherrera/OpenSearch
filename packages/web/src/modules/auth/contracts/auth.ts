import { object, string, pipe, email, minLength, forward, partialCheck, type InferOutput } from 'valibot';

export const LoginSchema = object({
    email: pipe(string(), email('Invalid email')),
    password: pipe(string(), minLength(1, 'Required'))
});

export const RegisterSchema = object({
    email: pipe(string(), email('Invalid email')),
    password: pipe(string(), minLength(8, 'At least 8 characters'))
});

export const ForgotPasswordSchema = object({
    email: pipe(string(), email('Invalid email'))
});

export const ResetPasswordSchema = pipe(
    object({
        password: pipe(string(), minLength(8, 'At least 8 characters')),
        confirm: pipe(string(), minLength(1, 'Required'))
    }),
    forward(
        partialCheck(
            [['password'], ['confirm']],
            (input) => input.password === input.confirm,
            'Passwords do not match'
        ),
        ['confirm']
    )
);

export type LoginInput = InferOutput<typeof LoginSchema>;
export type RegisterInput = InferOutput<typeof RegisterSchema>;
export type ForgotPasswordInput = InferOutput<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = InferOutput<typeof ResetPasswordSchema>;

export interface AuthSession{
    token: string;
}

export interface SessionAdmin{
    id: string;
    email: string;
    role: 'admin' | 'member';
}
