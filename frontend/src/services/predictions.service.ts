/**
 * Predictions Service
 * 
 * Handles prediction-related API calls including:
 * - Team name autocomplete/suggestions
 * - Validation of team names
 * - Prediction generation
 */

import api from '@/core/api/axios'

export interface TeamSuggestion {
  team: string
  confidence: number
  status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
}

export interface ValidationMetadata {
  home_team: {
    input: string
    canonical: string
    confidence: number
    status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
  }
  away_team: {
    input: string
    canonical: string
    confidence: number
    status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
  }
  threshold: number
  phase: string
}

export interface PredictionResponse {
  id: string
  home_team: string
  away_team: string
  league: string
  prediction: {
    home_win_prob: number
    draw_prob: number
    away_win_prob: number
    over_25_prob?: number
    btts_prob?: number
    value_bet?: string
    confidence?: number
    meta?: {
      validation: ValidationMetadata
    }
  }
  created_at: string
}

export interface PredictionError {
  error: string
  validation?: ValidationMetadata
}

/**
 * Get team suggestions for autocomplete
 * Calls backend to validate team name against master registry
 */
export async function getTeamSuggestions(
  teamInput: string,
  league: string
): Promise<TeamSuggestion | null> {
  try {
    // For now, we'll call the generate prediction endpoint with a dummy team
    // to get validation data. In production, you might want a dedicated endpoint.
    // This is a workaround that validates the team.
    
    const response = await api.get('/api/predictions/teams/', {
      params: {
        query: teamInput,
        league: league,
      },
    })
    return response.data
  } catch (error) {
    console.error('Failed to get team suggestions:', error)
    return null
  }
}

/**
 * Validate team names before sending to prediction engine
 * Returns validation metadata that shows confidence scores
 */
export async function validateTeamNames(
  homeTeam: string,
  awayTeam: string,
  league: string
): Promise<ValidationMetadata | null> {
  try {
    const response = await api.post('/api/predictions/validate/', {
      home_team: homeTeam,
      away_team: awayTeam,
      league: league,
    })
    return response.data.validation
  } catch (error) {
    console.error('Failed to validate teams:', error)
    return null
  }
}

/**
 * Generate a prediction for given teams
 * Returns prediction with validation metadata included
 */
export async function generatePrediction(
  homeTeam: string,
  awayTeam: string,
  league: string
): Promise<PredictionResponse | PredictionError> {
  try {
    const response = await api.post('/api/predictions/generate/', {
      home_team: homeTeam,
      away_team: awayTeam,
      league: league,
    })
    return response.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data
    }
    return {
      error: 'Failed to generate prediction',
    }
  }
}

/**
 * Get prediction history for current user
 */
export async function getPredictionHistory(
  league?: string,
  limit: number = 50
): Promise<{
  count: number
  predictions: PredictionResponse[]
}> {
  try {
    const response = await api.get('/api/predictions/history/', {
      params: {
        league,
        limit,
      },
    })
    return response.data
  } catch (error) {
    console.error('Failed to fetch prediction history:', error)
    return { count: 0, predictions: [] }
  }
}

/**
 * Get prediction analytics
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPredictionAnalytics(): Promise<any> {
  try {
    const response = await api.get('/api/predictions/analytics/')
    return response.data
  } catch (error) {
    console.error('Failed to fetch prediction analytics:', error)
    return null
  }
}

/**
 * Delete a single prediction
 */
export async function deletePrediction(predictionId: number): Promise<boolean> {
  try {
    await api.delete(`/api/predictions/${predictionId}/`)
    return true
  } catch (error) {
    console.error('Failed to delete prediction:', error)
    return false
  }
}

/**
 * Delete all predictions (with optional league filter)
 */
export async function deleteAllPredictions(league?: string): Promise<{ count: number } | null> {
  try {
    const response = await api.delete('/api/predictions/delete-all/', {
      params: {
        league,
        confirm: 'yes',
      },
    })
    return response.data
  } catch (error) {
    console.error('Failed to delete predictions:', error)
    return null
  }
}
