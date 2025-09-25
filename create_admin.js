const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists');
      console.log('Username: admin');
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Create new admin user
    const admin = new Admin({
      username: 'admin',
      email: 'admin@maralempay.com.ng',
      password: 'Admin123!@#', // Change this to a secure password
      role: 'super_admin',
      permissions: {
        viewAnalytics: true,
        manageUsers: true,
        manageTransactions: true,
        manageSettings: true
      },
      isActive: true
    });

    await admin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Email: admin@maralempay.com.ng');
    console.log('Password: Admin123!@#');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

createAdmin();
