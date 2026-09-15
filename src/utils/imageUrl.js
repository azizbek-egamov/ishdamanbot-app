/**
 * Universal media image URL resolver.
 * Combines relative image paths with the backend domain from .env.
 */
export function getImageUrl(path) {
  if (!path) return '';

  let cleanPath = String(path).trim();

  // Agar URL'da localhost yoki 127.0.0.1 qolib ketgan bo'lsa, uni tozalaymiz
  if (cleanPath.startsWith('http://127.0.0.1:8000') || cleanPath.startsWith('http://localhost:8000')) {
    cleanPath = cleanPath.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, '');
  }

  // Agar to'liq tashqi havola (https://...) bo'lsa o'zini qaytaramiz
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // Boshida slash bo'lishini ta'minlash
  const relativePath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  // .env dagi backend domenini olish
  let backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  // Agar VITE_BACKEND_URL bo'lmasa, VITE_WS_URL dan avtomatik https domenni hosil qilish
  if (!backendUrl && import.meta.env.VITE_WS_URL) {
    try {
      backendUrl = import.meta.env.VITE_WS_URL
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');
    } catch {
      // ignore
    }
  }

  backendUrl = backendUrl.replace(/\/+$/, '');

  return backendUrl ? `${backendUrl}${relativePath}` : relativePath;
}

export default getImageUrl;
