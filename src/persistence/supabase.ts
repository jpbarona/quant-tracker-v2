import { createClient } from '@supabase/supabase-js'
import type { AppState } from '../types'
import type { AppRepository } from './repository'
import {
  throwCloudFetchError,
  throwCloudPayloadValidationError,
  throwCloudSaveError,
  throwCloudSeedError,
} from './supabaseErrors'

interface SupabaseRepositoryOptions {
  fallback: () => AppRepository
  defaultState: () => AppState
  validateState: (candidate: unknown) => AppState
  allowLocalFallback: boolean
}

interface AppStateRow {
  id: string
  payload: unknown
  updated_at: string
}

const STATE_ROW_ID = 'single_user'

export const createSupabaseRepository = (
  url: string,
  anonKey: string,
  options: SupabaseRepositoryOptions,
): AppRepository => {
  const client = createClient(url, anonKey)
  const fallback = options.allowLocalFallback ? options.fallback() : null

  const getState = async (): Promise<AppState> => {
    const response = await client
      .from('app_state')
      .select('id,payload,updated_at')
      .eq('id', STATE_ROW_ID)
      .single()

    if (response.error) {
      if (response.error.code === 'PGRST116') {
        const seeded = options.defaultState()
        const insert = await client.from('app_state').insert({
          id: STATE_ROW_ID,
          payload: seeded,
        })
        if (insert.error) {
          if (options.allowLocalFallback && fallback) {
            return fallback.getState()
          }
          return throwCloudSeedError(insert.error)
        }
        return seeded
      }
      if (options.allowLocalFallback && fallback) {
        return fallback.getState()
      }
      return throwCloudFetchError(response.error)
    }

    try {
      const row = response.data as AppStateRow
      return options.validateState(row.payload)
    } catch (error) {
      if (options.allowLocalFallback && fallback) {
        return fallback.getState()
      }
      const message = error instanceof Error ? error.message : 'Unknown validation error'
      return throwCloudPayloadValidationError(message)
    }
  }

  const saveState = async (state: AppState): Promise<void> => {
    options.validateState(state)

    const upsert = await client.from('app_state').upsert({
      id: STATE_ROW_ID,
      payload: state,
    })

    if (upsert.error) {
      if (options.allowLocalFallback && fallback) {
        await fallback.saveState(state)
        return
      }
      return throwCloudSaveError(upsert.error)
    }
  }

  return {
    getState,
    saveState,
    status: {
      mode: 'supabase',
      cloudAvailable: true,
    },
  }
}
