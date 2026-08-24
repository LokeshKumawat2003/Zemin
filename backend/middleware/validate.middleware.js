const AppError = require('../utils/AppError');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(
      new AppError(
        'VALIDATION_ERROR',
        400,
        'Invalid input',
        error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
      )
    );
  }

  req[source] = value;
  next();
};

module.exports = validate;
