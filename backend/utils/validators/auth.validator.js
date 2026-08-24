const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).required(),
  email: Joi.string().email().when('registrationMethod', {
    is: 'email',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .when('registrationMethod', {
      is: 'phone',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({ 'string.pattern.base': 'Password must include upper, lower, and number' }),
  registrationMethod: Joi.string().valid('email', 'phone').default('email'),
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
  deviceId: Joi.string().optional(),
  fcmToken: Joi.string().optional(),
});

const verifyOtpSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  purpose: Joi.string().valid('registration', 'password_reset', 'phone_change').required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
});

const resetPasswordSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({ 'string.pattern.base': 'Password must include upper, lower, and number' }),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
