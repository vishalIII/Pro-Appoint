const User = require('../../models/user/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../../utils/appError.js');
exports.createUser = async (name, email, password) => {
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email already registered', 400, { existingUser: existing });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      tenantId: null,
    });

    return user;
  } catch (error) {
    throw new AppError(error.message, error.status || 500);
  }
}
exports.loginUser = async (email, password) => {
  try {
    const user = await User.findOne({ email })
      .select('+password')


    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        tenantId: user.tenantId ? user.tenantId._id : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    user.password = undefined;
    return { user, token };

  } catch (error) {
    throw new AppError(error.message, error.status || 500);
  }
}
