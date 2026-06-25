export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.info('SW registered:', registration.scope)
        })
        .catch((err) => {
          console.warn('SW registration failed:', err)
        })
    })
  }
}
