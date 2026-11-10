const authBaseUrl = import.meta.env.VITE_AUTH_URL?.replace(/\/api\/v1\/?$/, '');

const normalizeCloudinaryUrl = (url) => {
  if (!url) return url;
  return url.replace(/(\/v\d+)(?!\/)/, '$1/');
};

export const normalizeProfilePicture = (url) => {
  if (!url) return null;
  if (/^(https?:)?\/\//.test(url)) {
    const resolved = url.startsWith('//') ? `https:${url}` : url;
    return normalizeCloudinaryUrl(resolved);
  }
  if (url.startsWith('/')) return normalizeCloudinaryUrl(`${authBaseUrl}${url}`);
  return normalizeCloudinaryUrl(`${authBaseUrl}/${url}`);
};
