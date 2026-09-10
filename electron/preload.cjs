const { contextBridge, ipcRenderer } = require('electron')

const EVENT_CHANNELS = new Set(['integrity', 'tests:progress', 'exam:finished', 'lockdown:status'])
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('bluebook', {
  isElectron: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  store: {
    get: (key) => invoke('store:get', key),
    set: (key, value) => invoke('store:set', key, value),
    delete: (key) => invoke('store:delete', key),
  },
  sessions: {
    list: () => invoke('sessions:list'),
    get: (id) => invoke('sessions:get', id),
    save: (session) => invoke('sessions:save', session),
    delete: (id) => invoke('sessions:delete', id),
  },
  tests: {
    manifest: () => invoke('tests:manifest'),
    download: (testId) => invoke('tests:download', testId),
    load: (testId) => invoke('tests:load', testId),
    remove: (testId) => invoke('tests:remove', testId),
  },
  exam: {
    start: (sessionId, options) => invoke('exam:start', sessionId, options),
    finish: (sessionId, options) => invoke('exam:finish', sessionId, options),
    abort: (sessionId) => invoke('exam:abort', sessionId),
  },
  system: {
    displays: () => invoke('system:displays'),
    info: () => invoke('system:info'),
    quit: () => invoke('app:quit'),
    openExternal: (url) => invoke('shell:open', url),
  },
  on(channel, callback) {
    if (!EVENT_CHANNELS.has(channel)) throw new Error(`Unknown event channel: ${channel}`)
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
})
