export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  email: string;
  phone?: string;
}

export interface UpdateCompanyInput {
  name: string;
}
