import { Amplify } from 'aws-amplify'

export function isCognitoConfigured() {
  return Boolean(
    import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim() &&
      import.meta.env.VITE_COGNITO_CLIENT_ID?.trim()
  )
}

export function configureAmplify() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim()
  const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID?.trim()
  if (!userPoolId || !userPoolClientId) return false
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: { email: true },
      },
    },
  })
  return true
}
