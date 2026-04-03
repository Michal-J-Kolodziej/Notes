export type EntryStatus =
  | 'draft_local'
  | 'recording'
  | 'processing'
  | 'review_ready'
  | 'saved_local'
  | 'syncing'
  | 'saved_remote'
  | 'needs_retry'

export type EntrySourceType = 'voice' | 'text'

export type EntryOwnerMode = 'guest_local' | 'account_local' | 'account_synced'

export type EntryStorageMode = 'transcript_only' | 'transcript_plus_audio'

export interface EntryRecord {
  id: string
  deviceLocalId: string
  userId?: string
  ownerMode: EntryOwnerMode
  sourceType: EntrySourceType
  status: EntryStatus
  title: string
  transcript: string
  hasAudio: boolean
  audioFileId: string | null
  storageMode: EntryStorageMode
  createdAt: number
  updatedAt: number
}

export interface EntryStoreAudioFile {
  blob: Blob
  id: string
}

export interface EntryStoreSnapshot {
  audioFiles: EntryStoreAudioFile[]
  entries: EntryRecord[]
}

export interface EntryStore {
  persistenceMode: 'indexeddb' | 'memory'
  saveEntry(entry: EntryRecord): Promise<EntryRecord>
  saveEntryWithAudio(entry: EntryRecord, audio: Blob): Promise<EntryRecord>
  getEntry(id: string): Promise<EntryRecord | undefined>
  listEntries(): Promise<EntryRecord[]>
  deleteEntry(id: string): Promise<void>
  getEntryAudio(audioFileId: string): Promise<Blob | undefined>
  saveAudioFile(id: string, blob: Blob): Promise<Blob>
  getAudioFile(id: string): Promise<Blob | undefined>
  deleteAudioFile(id: string): Promise<void>
  replaceAll(snapshot: EntryStoreSnapshot): Promise<void>
  clear(): Promise<void>
}
