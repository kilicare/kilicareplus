import api from '@/core/api/axios'

export interface FollowCheckResponse {
  is_following: boolean
  followers_count: number
  following_count: number
}

export interface FollowToggleResponse {
  following: boolean
  followers_count: number
}

export interface FollowUser {
  id: number
  username: string
  first_name: string
  role: string
  is_verified: boolean
  avatar: string | null
  is_following: boolean
}

export const followService = {
  /**
   * Toggle follow/unfollow for a user
   */
  async toggleFollow(userId: number): Promise<FollowToggleResponse> {
    try {
      const { data } = await api.post<FollowToggleResponse>(`/api/follow/${userId}/toggle/`)
      return data
    } catch (error) {
      console.error('[FollowService] Failed to toggle follow:', error)
      throw error
    }
  },

  /**
   * Check if current user follows another user
   */
  async checkFollow(userId: number): Promise<FollowCheckResponse> {
    try {
      const { data } = await api.get<FollowCheckResponse>(`/api/follow/${userId}/check/`)
      return data
    } catch (error) {
      console.error('[FollowService] Failed to check follow status:', error)
      throw error
    }
  },

  /**
   * Get list of followers for a user
   */
  async getFollowers(userId: number): Promise<FollowUser[]> {
    try {
      const { data } = await api.get<FollowUser[]>(`/api/follow/${userId}/followers/`)
      return data
    } catch (error) {
      console.error('[FollowService] Failed to get followers:', error)
      throw error
    }
  },

  /**
   * Get list of users that a user follows
   */
  async getFollowing(userId: number): Promise<FollowUser[]> {
    try {
      const { data } = await api.get<FollowUser[]>(`/api/follow/${userId}/following/`)
      return data
    } catch (error) {
      console.error('[FollowService] Failed to get following:', error)
      throw error
    }
  },
}
