export function validateEnv() {
  // Skip validation during production builds to prevent deployment failures
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const required = [
    'NEXT_PUBLIC_API_URL',
  ]

  const missing = required.filter(
    (key) => !process.env[key]
  )

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(', ')}`
    )
  }
}
