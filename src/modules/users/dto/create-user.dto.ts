export interface CreateUserDTO {
  email: string;
  fullName: string;
  password: string;
  tenantId: string;
  role?: 'USER' | 'ADMIN';
}
