// frontend/src/utils/sanitize.ts
import DOMPurify from 'dompurify';

// ✅ Configuration sécurisée par défaut
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'p', 'br', 
    'ul', 'ol', 'li', 'a', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

export const sanitizeHtml = (html: string, config = DEFAULT_CONFIG): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, config);
};

export const sanitizeText = (text: string): string => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
};

export const sanitizeInput = <T>(data: T): T => {
  if (typeof data === 'string') {
    return sanitizeText(data) as T;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeInput) as T;
  }
  if (data && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeInput(value);
    }
    return result;
  }
  return data;
};