import { create } from 'zustand'
import bridge from '../lib/bridge.js'

function nextSaturday() {
  const d = new Date()
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7) + (d.getDay() >= 4 ? 7 : 0))
  d.setHours(8, 0, 0, 0)
  return d.toISOString()
}

export function tzLabel() {
  const off = -new Date().getTimezoneOffset() / 60
  const sign = off >= 0 ? '+' : '-'
  return `${sign}${String(Math.floor(Math.abs(off))).padStart(2, '0')}`
}

export const FIXED_STUDENT_NAME = 'Askarjon Arslonov'

export const DEFAULT_SETTINGS = {
  signedIn: false,
  email: '',
  studentName: FIXED_STUDENT_NAME,
  lockdown: true,
  chat: { enabled: true, url: '' },
  registration: {
    test: 'SAT',
    date: nextSaturday(),
    arrival: '7:45 a.m.',
    doorsClose: '8:00 a.m.',
    center: { name: 'New Uzbekistan University', lines: ['MOVAROUNNAHR 1 STREET', 'MIRZO ULUGBEK DISTRICT', 'TASHKENT CITY, UZ'] },
    accommodations: null,
    setupComplete: false,
    setupTestId: null,
  },
}

let subscribed = false

export const useLobbyStore = create((set, get) => ({
  loading: true,
  manifest: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
  progress: {},
  info: null,
  error: null,

  async init() {
    if (!subscribed) {
      subscribed = true
      bridge.on('tests:progress', (p) => set((s) => ({ progress: { ...s.progress, [p.testId]: p } })))
    }
    try {
      const [manifest, sessions, settings, info] = await Promise.all([
        bridge.tests.manifest(),
        bridge.sessions.list(),
        bridge.store.get('settings'),
        bridge.system.info(),
      ])
      // The student name is fixed system-wide: re-assert it on every load so an
      // older saved value (e.g. from before a spelling fix) never sticks around.
      const merged = { ...DEFAULT_SETTINGS, ...(settings || {}), studentName: FIXED_STUDENT_NAME, registration: { ...DEFAULT_SETTINGS.registration, ...(settings?.registration || {}) } }
      set({ manifest, sessions, settings: merged, info, loading: false, error: null })
      if (settings?.studentName !== FIXED_STUDENT_NAME) await bridge.store.set('settings', merged)
    } catch (err) {
      set({ loading: false, error: err.message || String(err) })
    }
  },

  async refresh() {
    const [manifest, sessions] = await Promise.all([bridge.tests.manifest(), bridge.sessions.list()])
    set({ manifest, sessions })
  },

  async download(testId) {
    set((s) => ({ progress: { ...s.progress, [testId]: { testId, percent: 0, loaded: 0, total: 0 } } }))
    try {
      await bridge.tests.download(testId)
    } finally {
      set((s) => {
        const progress = { ...s.progress }
        delete progress[testId]
        return { progress }
      })
      await get().refresh()
    }
  },

  async remove(testId) {
    await bridge.tests.remove(testId)
    await get().refresh()
  },

  async saveSettings(patch) {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    await bridge.store.set('settings', settings)
  },

  async deleteSession(id) {
    await bridge.sessions.delete(id)
    await get().refresh()
  },
}))
