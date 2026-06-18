// API Endpoints - Single Source of Truth

export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login/',
  AUTH_REGISTER: '/auth/register/',
  AUTH_REFRESH: '/auth/refresh/',
  AUTH_OTP_SEND: '/auth/otp/send/',
  AUTH_OTP_VERIFY: '/auth/otp/verify/',
  AUTH_RESET_PASSWORD: '/auth/reset-password/',
  AUTH_RESET_PASSWORD_CONFIRM: '/auth/reset-password/confirm/',
  
  // Admin - Testimonials
  ADMIN_TESTIMONIALS: '/api/admin-ops/testimonials/',
  
  // Admin - Moments
  ADMIN_MOMENTS: '/api/admin-ops/moments/',
  
  // AI Service
  AI_CHAT: '/api/ai/chat/',
  AI_PREDICT: '/api/ai/predict/',
  
  // WebSocket
  WS_NOTIFICATIONS: '/ws/notifications/',
  WS_CHAT: '/ws/chat/',
} as const
