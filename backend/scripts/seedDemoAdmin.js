#!/usr/bin/env node

/**
 * Demo Admin Seed Script
 * Creates a demo admin account for testing purposes
 * 
 * Usage: node scripts/seedDemoAdmin.js
 * 
 * Demo Credentials:
 * - Email: demo-zemin@gmail.com
 * - Password: demo123
 * - Username: demo-admin
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedDemoAdmin() {
  try {
    console.log('\n🌱 Seeding Demo Admin Account...\n');

    // Import required modules
    const { connectDB, connectAuthDB, getAuthModels } = require('../config/database');
    const { hashPassword } = require('../utils/bcrypt.util');

    // Connect to databases
    console.log('📡 Connecting to databases...');
    await connectDB();
    await connectAuthDB();

    const { User } = getAuthModels();

    console.log('✅ Connected to databases\n');

    // Demo admin credentials
    const demoAdmin = {
      username: 'demo-admin',
      email: 'demo-zemin@gmail.com',
      password: 'demo123',
      displayName: 'Demo Admin',
    };

    // Check if demo admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { username: demoAdmin.username },
        { email: demoAdmin.email },
      ],
    });

    if (existingAdmin) {
      console.log('⚠️  Demo admin account already exists!\n');
      console.log('📋 Existing Admin Details:');
      console.log(`  Username: ${existingAdmin.username}`);
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Role: ${existingAdmin.role}\n`);

      console.log('To delete and recreate:');
      console.log(`  await User.deleteOne({ email: "${demoAdmin.email}" })\n`);

      process.exit(0);
    }

    console.log('🔨 Creating demo admin account...\n');

    // Create demo admin account
    const newAdmin = await User.create({
      username: demoAdmin.username,
      email: demoAdmin.email,
      passwordHash: await hashPassword(demoAdmin.password),
      displayName: demoAdmin.displayName,
      isVerified: true, // Already verified for demo purposes
      role: 'admin',
      isCreator: false,
    });

    console.log('✅ Demo admin account created successfully!\n');
    console.log('📋 Demo Admin Credentials:');
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Password: ${demoAdmin.password}`);
    console.log(`  Username: ${newAdmin.username}`);
    console.log(`  Role: ${newAdmin.role}`);
    console.log(`  ID: ${newAdmin._id}\n`);

    console.log('🔓 Login with demo credentials:');
    console.log(`  POST /auth/admin/login`);
    console.log(`  {`);
    console.log(`    "username": "${demoAdmin.username}",`);
    console.log(`    "password": "${demoAdmin.password}"`);
    console.log(`  }\n`);

    console.log('Or use email:');
    console.log(`  {`);
    console.log(`    "username": "${demoAdmin.email}",`);
    console.log(`    "password": "${demoAdmin.password}"`);
    console.log(`  }\n`);

    console.log('📌 Access all admin endpoints with the returned access token:\n');
    console.log(`  Authorization: Bearer <accessToken>\n`);

    console.log('⚠️  WARNING: This is a demo account for testing only.');
    console.log('Delete this account before deploying to production!\n');

    console.log('🎉 Demo setup complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding demo admin:', error.message, '\n');
    console.error(error.stack);
    process.exit(1);
  }
}

seedDemoAdmin();
