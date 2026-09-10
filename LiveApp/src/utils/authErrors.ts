type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
  message?: string;
};

export type SignupFieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  avatar?: string;
  legal?: string;
};

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const payload = error as ApiErrorPayload | undefined;
  const details = payload?.error?.details;

  if (details?.length) {
    return details.map(d => d.message.replace(/^"(.+)" /, '$1 ')).join('\n');
  }

  return payload?.error?.message || payload?.message || fallback;
}

export function getAuthFieldErrors(error: unknown): SignupFieldErrors {
  const payload = error as ApiErrorPayload | undefined;
  const fieldErrors: SignupFieldErrors = {};

  payload?.error?.details?.forEach(detail => {
    const field = detail.field === 'termsAccepted' || detail.field === 'privacyPolicyAccepted'
      ? 'legal'
      : detail.field as keyof SignupFieldErrors;
    if (['username', 'email', 'password', 'avatar', 'legal'].includes(field)) {
      fieldErrors[field] = detail.message.replace(/^"(.+)" /, '$1 ');
    }
  });

  return fieldErrors;
}

export function validateSignupFields(
  username: string,
  email: string,
  password: string,
  avatarUri?: string,
  legalAccepted = false,
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};

  if (!username) {
    errors.username = 'Username is required';
  } else if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    errors.username = 'Use 3–20 letters or numbers only';
  }
  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Use at least 8 characters';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.password = 'Add an uppercase letter, lowercase letter, and number';
  }
  if (!legalAccepted) errors.legal = 'Please accept the Terms of Service and Privacy Policy';

  return errors;
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
