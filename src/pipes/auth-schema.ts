import { z } from 'zod';

export const createUserSchema = z
  .object({
    email: z.string('Field is required.'),
    fullName: z.string('Field is required.'),
    password: z.string('Field is required.'),
    tenantId: z.string('Field is required.'),
    role: z.enum(['USER', 'ADMIN']).optional(),
  })
  .required();

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const loginUserSchema = z
  .object({
    email: z.string('Field is required.'),
    password: z.string('Field is required.'),
  })
  .required();

export type loginUserSchema = z.infer<typeof loginUserSchema>;
