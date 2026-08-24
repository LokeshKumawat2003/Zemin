export const getAvatarInitials = (value?: string) => {
  const text = (value || '').trim();

  if (!text) {
    return '?';
  }

  return text.charAt(0).toUpperCase();
};
