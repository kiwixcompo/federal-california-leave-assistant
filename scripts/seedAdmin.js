const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leave-assistant');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'talk2char@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'talk2char@gmail.com',
      password: 'Password@123',
      isAdmin: true,
      emailVerified: true,
      termsAccepted: true,
      comped: true
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: talk2char@gmail.com');
    console.log('Password: Password@123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();