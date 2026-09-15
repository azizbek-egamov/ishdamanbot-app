/**
 * Universal media image URL resolver.
 * Combines relative image paths with the backend domain from .env / API config.
 */
export function getImageUrl(path) {
  if (!path) return '';

  let cleanPath = String(path).trim();
  if (!cleanPath) return '';

  // Agar URL'da localhost:8000 yoki 127.0.0.1:8000 qolib ketgan bo'lsa va hozir prod/boshqa muhitda bo'lsak
  const isLocalBackend = cleanPath.startsWith('http://127.0.0.1:8000') || cleanPath.startsWith('http://localhost:8000');
  if (isLocalBackend) {
    cleanPath = cleanPath.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, '');
  }

  // Agar tashqi to'liq havola bo'lsa (masalan unsplash yoki boshqa cdn)
  if ((cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) && !isLocalBackend) {
    return cleanPath;
  }

  // Boshida slash bo'lishini ta'minlash
  const relativePath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  // 1. .env dagi VITE_BACKEND_URL ni olish
  let backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  // 2. Agar VITE_BACKEND_URL bo'lmasa, VITE_API_URL dan olish (/api ni qirqib)
  if (!backendUrl && import.meta.env.VITE_API_URL) {
    const apiUrl = String(import.meta.env.VITE_API_URL).trim();
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      backendUrl = apiUrl.replace(/\/api\/?$/, '');
    }
  }

  // 3. Agar VITE_WS_URL bo'lsa, undan https/http yaratish
  if (!backendUrl && import.meta.env.VITE_WS_URL) {
    try {
      backendUrl = import.meta.env.VITE_WS_URL
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');
    } catch {
      // ignore
    }
  }

  // 4. Agar hech qanday env sozlanmagan bo'lsa:
  if (!backendUrl) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        backendUrl = 'http://127.0.0.1:8000';
      } else {
        backendUrl = 'https://core.ishdaman.uz';
      }
    } else {
      backendUrl = 'https://core.ishdaman.uz';
    }
  }

  backendUrl = backendUrl.replace(/\/+$/, '');

  return backendUrl ? `${backendUrl}${relativePath}` : relativePath;
}

export default getImageUrl;

