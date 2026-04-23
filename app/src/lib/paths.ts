type ImportMetaWithEnv = ImportMeta & {
  env?: {
    BASE_URL?: string
  }
}

const rawBasePath = (import.meta as ImportMetaWithEnv).env?.BASE_URL || '/'

export const appBasePath = rawBasePath.endsWith('/')
  ? rawBasePath.slice(0, -1) || '/'
  : rawBasePath

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (appBasePath === '/') {
    return normalizedPath
  }

  return `${appBasePath}${normalizedPath}`
}

export function buildApiPath(path: string) {
  return withBasePath(`/api${path.startsWith('/') ? path : `/${path}`}`)
}

export function buildApiUrl(path: string) {
  return new URL(buildApiPath(path), window.location.origin).toString()
}

export function buildWebSocketUrl(path: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return new URL(withBasePath(path), `${protocol}//${window.location.host}`).toString()
}
