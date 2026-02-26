// services/createAdmin-simple.js
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

const admins = [
  {
    name: 'Joshua Juma',
    email: 'joshuajuma039@gmail.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true
  },
  {
    name: 'Syphero Josphat',
    email: 'sypherojosphat@gmail.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true
  }
];

const createAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(50));
    console.log('ADMIN ACCOUNTS TO BE CREATED');
    console.log('='.repeat(50));
    
    // Show credentials before creating
    admins.forEach((admin, index) => {
      console.log(`\n👤 Admin ${index + 1}:`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`); // LOGGED HERE
      console.log(`   Role: ${admin.role}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('CREATING ACCOUNTS...');
    console.log('='.repeat(50));

    for (const adminData of admins) {
      const existingUser = await User.findOne({ email: adminData.email });
      
      if (!existingUser) {
        const user = await User.create(adminData);
        console.log(`\n✅ Created: ${adminData.email}`);
        console.log(`   Password: ${adminData.password}`); // LOGGED HERE
        console.log(`   ID: ${user._id}`);
      } else {
        console.log(`\n⏭️  Already exists: ${adminData.email}`);
        console.log(`   Password would have been: ${adminData.password}`); // LOGGED HERE
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('FINAL CREDENTIALS SUMMARY');
    console.log('='.repeat(50));
    
    admins.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.name}`);
      console.log(`   📧 ${admin.email}`);
      console.log(`   🔑 ${admin.password}`); // LOGGED HERE
      console.log(`   👤 ${admin.role}`);
    });

    console.log('\n⚠️  Save these credentials!');
    console.log('🔐 Login at: http://localhost:5173/login');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmins();