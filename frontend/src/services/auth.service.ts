import api from '@/core/api/axios'
import type { AuthResponse, User } from '@/types'

export const authService = {
  async register(data: {
    username: string
    email: string
    password: string
    password2: string
    first_name?: string
    last_name?: string
    role: 'TOURIST' | 'LOCAL_GUIDE'
    phone?: string
  }) {
    const { data: res } = await api.post('/auth/register/', data)
    return res
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login/', {
      email,
      password,
    })
    return data
  },

  async logout(refresh: string) {
    try {
      await api.post('/auth/logout/', { refresh })
    } catch {
      // ignore
    }
  },

  async sendOtp(email: string, purpose = 'EMAIL_VERIFY') {
    const { data } = await api.post('/auth/otp/send/', {
      email,
      purpose,
    })
    return data
  },

  async verifyOtp(
    email: string,
    code: string,
    purpose = 'EMAIL_VERIFY'
  ) {
    const { data } = await api.post('/auth/otp/verify/', {
      email,
      code,
      purpose,
    })
    return data
  },

  async resetPassword(email: string) {
    const { data } = await api.post('/auth/password/reset/', { email })
    return data
  },

  async confirmPassword(
    email: string,
    code: string,
    new_password: string,
    new_password2: string
  ) {
    const { data } = await api.post('/auth/password/confirm/', {
      email,
      code,
      new_password,
      new_password2,
    })
    return data
  },

  async verifyForgotOtp(email: string, otp: string) {
    const { data } = await api.post('/auth/verify-forgot-otp/', {
      email,
      otp,
    })
    return data
  },

  async resetPasswordNew(
    email: string,
    otp: string,
    new_password: string,
    new_password_confirm: string
  ) {
    const { data } = await api.post('/auth/reset-password/', {
      email,
      otp,
      new_password,
      new_password_confirm,
    })
    return data
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/auth/me/')
    return data
  },

  async updateMe(formData: FormData | Record<string, unknown>): Promise<User> {
    const isForm = formData instanceof FormData
    const { data } = await api.put<User>('/auth/me/', formData, {
      headers: isForm
        ? { 'Content-Type': 'multipart/form-data' }
        : { 'Content-Type': 'application/json' },
    })
    return data
  },

  async checkUsername(username: string) {
    const { data } = await api.get('/auth/check-username/', {
      params: { username },
    })
    return data
  },
}