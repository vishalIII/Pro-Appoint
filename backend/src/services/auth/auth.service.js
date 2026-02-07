const User = require('../../models/user/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.createUser=async(name, email, password) =>{
    try{
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
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
}catch(err){
    throw err;  
}
}
exports.loginUser=async(email, password) => {
    try{
  const user = await User.findOne({ email })
    .select('+password')
    

  if (!user || !user.isActive) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
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

}catch(err){
    throw err;
}
}
