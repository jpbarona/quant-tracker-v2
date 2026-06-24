import type { PostgrestError } from '@supabase/supabase-js'
import { CloudPersistenceError } from './cloudConfig'

const formatPostgrestError = (operation: string, error: PostgrestError): string => {
  const parts = [`Supabase ${operation} failed.`]
  if (error.code) {
    parts.push(`Code: ${error.code}.`)
  }
  if (error.message) {
    parts.push(error.message)
  }
  if (error.details) {
    parts.push(`Details: ${error.details}`)
  }
  if (error.hint) {
    parts.push(`Hint: ${error.hint}`)
  }
  return parts.join(' ')
}

export const throwCloudFetchError = (error: PostgrestError): never => {
  throw new CloudPersistenceError(formatPostgrestError('read from app_state', error))
}

export const throwCloudSeedError = (error: PostgrestError): never => {
  throw new CloudPersistenceError(
    `Supabase could not create the initial app_state row. ${formatPostgrestError('insert into app_state', error)}`,
  )
}

export const throwCloudSaveError = (error: PostgrestError): never => {
  throw new CloudPersistenceError(formatPostgrestError('save to app_state', error))
}

export const throwCloudPayloadValidationError = (message: string): never => {
  throw new CloudPersistenceError(
    `Supabase app_state payload failed validation and cannot be loaded. ${message}`,
  )
}
