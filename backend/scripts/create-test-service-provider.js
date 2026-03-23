const mongoose = require('mongoose');
const User = require('../src/models/user/user.model');
const Tenant = require('../src/models/tenant/tenant.model');
const bcrypt = require('bcrypt');
const connectDB = require('../src/config/db');

async function createTestProvider() {
  await connectDB();
  
  // Cleanup existing
  await User.deleteOne({ email: 'test.provider@example.com' });
  await Tenant.deleteOne({ email: 'test.provider@example.com' });
  
  // Create user (ServiceProvider role)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  const user = await User.create({
    name: 'Test Service Provider',
    email: 'test.provider@example.com',
    password: hashedPassword,
    role: 'ServiceProvider',
    isActive: true,
    isVerified: true,
    tenantId: null // Will be set after tenant creation
  });
  
  // Create tenant
  const tenant = await Tenant.create({
    name: 'Test Tenant',
    email: 'test.provider@example.com',
    plan: 'basic',
    planStatus: 'active',
    isActive: true,
    walletBalance: 1000,
    subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
  });
  
  // Link tenant to user
  user.tenantId = tenant._id;
  await user.save();
  
  console.log('✅ Test ServiceProvider created:');
  console.log(`Email: test.provider@example.com`);
  console.log(`Password: password123`);
  console.log(`User ID: ${user._id}`);
  console.log(`Tenant ID: ${tenant._id}`);
  console.log(`Wallet Balance: ${tenant.walletBalance}`);
  
  process.exit(0);
}

createTestProvider().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

