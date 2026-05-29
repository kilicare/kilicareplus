export type UserRole = 'TOURIST' | 'LOCAL_GUIDE' | 'ADMIN' | 'B2B'
export type PassportLevel =
  | 'EXPLORER'
  | 'ADVENTURER'
  | 'GUARDIAN'
  | 'LEGEND'
export type SubscriptionPlanName =
  | 'FREE'
  | 'BASIC_CREATOR'
  | 'BUSINESS_CREATOR'
  | 'PRO_GUIDE'
  | 'TOURIST_PREMIUM'
  | 'SPORTS_PREMIUM'

export interface UserProfile {
  avatar: string | null
  avatar_url: string | null
  cover_photo: string | null
  cover_photo_url: string | null
  bio: string | null
  location: string | null
  date_of_birth: string | null
  gender: 'M' | 'F' | 'O' | null
  website: string | null
}

export interface PassportInfo {
  points: number
  level: PassportLevel
  trust_score: number
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: UserRole
  is_verified: boolean
  date_joined: string
  profile: UserProfile
  passport_info: PassportInfo | null
}

export interface AuthResponse {
  success: boolean
  access: string
  refresh: string
  user: User
}

export interface PassportProfile {
  id: number
  username: string
  first_name: string
  avatar_url: string | null
  trust_score: number
  points: number
  level: PassportLevel
  level_display: string
  next_level: PassportLevel | null
  points_to_next: number
  progress_percent: number
  is_verified: boolean
  created_at: string
}

export interface PointsTransaction {
  id: number
  action_type: string
  points_change: number
  balance_after: number
  description: string
  created_at: string
}

export interface Badge {
  id: number
  name: string
  description: string
  icon: string
  criteria_points: number
  badge_type: string
  is_unlocked: boolean
  unlocked_at: string | null
  user_progress: number
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  first_name: string
  avatar: string | null
  role: UserRole
  points: number
  level: PassportLevel
  trust_score: number
  is_me: boolean
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}