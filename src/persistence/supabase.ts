import { createClient } from '@supabase/supabase-js'
import type { AppState } from '../types'
import type { AppRepository } from './repository'

interface SupabaseRepositoryOptions {
  fallback: () => AppRepository
  defaultState: () => AppState
  validateState: (candidate: unknown) => AppState
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
  const fallback = options.fallback()

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
          return fallback.getState()
        }
        return seeded
      }
      return fallback.getState()
    }

    try {
      const row = response.data as AppStateRow
      return options.validateState(row.payload)
    } catch {
      return fallback.getState()
    }
  }

  const saveState = async (state: AppState): Promise<void> => {
    options.validateState(state)

    const upsert = await client.from('app_state').upsert({
      id: STATE_ROW_ID,
      payload: state,
    })

    if (upsert.error) {
      await fallback.saveState(state)
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
