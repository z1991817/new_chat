const CLEANUP_RELOAD_KEY = 'artimg:service-worker-cleanup-reloaded'

function hasReloadedForCleanup() {
  try {
    return sessionStorage.getItem(CLEANUP_RELOAD_KEY) === 'true'
  } catch {
    return false
  }
}

function markReloadedForCleanup() {
  try {
    sessionStorage.setItem(CLEANUP_RELOAD_KEY, 'true')
  } catch {
    // Ignore storage failures and keep rendering.
  }
}

function clearReloadedForCleanup() {
  try {
    sessionStorage.removeItem(CLEANUP_RELOAD_KEY)
  } catch {
    // Ignore storage failures.
  }
}

async function deleteBrowserCaches() {
  if (typeof caches === 'undefined') return

  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

export async function retireServiceWorkers(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  const hadController = Boolean(navigator.serviceWorker.controller)

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
    await deleteBrowserCaches()
  } catch (error) {
    console.error('Service worker cleanup failed:', error)
  }

  if (!hadController) {
    clearReloadedForCleanup()
    return false
  }

  if (hasReloadedForCleanup()) {
    return false
  }

  markReloadedForCleanup()
  return true
}
