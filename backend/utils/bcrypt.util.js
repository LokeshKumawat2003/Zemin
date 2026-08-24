const bcrypt = require('bcryptjs');

const hashPassword = async (password) => bcrypt.hash(password, 12);

const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

module.exports = { hashPassword, comparePassword };
