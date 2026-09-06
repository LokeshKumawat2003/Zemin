type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
  message?: string;
};

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const payload = error as ApiErrorPayload | undefined;
  const details = payload?.error?.details;

  if (details?.length) {
    return details.map(d => d.message.replace(/^"(.+)" /, '$1 ')).join('\n');
  }

  return payload?.error?.message || payload?.message || fallback;
}

export function validateSignupInput(
  username: string,
  email: string,
  password: string,
): string | null {
  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return 'Username must be 3–20 letters or numbers only';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must include uppercase, lowercase, and a number';
  }
  return null;
}
