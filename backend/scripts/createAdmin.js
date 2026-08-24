#!/usr/bin/env node

/**
 * Admin Setup Script
 * Creates the first admin account for the platform
 * 
 * Usage: node scripts/createAdmin.js
 */

const readline = require('readline');
const crypto = require('crypto');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔐 Admin Account Setup\n');
  console.log('This script will create the first admin account for your platform.\n');

  try {
    // Check if ADMIN_SECRET_KEY exists
    if (!process.env.ADMIN_SECRET_KEY) {
      console.log('⚠️  ADMIN_SECRET_KEY not found in .env file');
      console.log('Setting a random one for you...\n');
      
      const randomSecret = crypto.randomBytes(32).toString('hex');
      console.log('Add this to your .env file:\n');
      console.log(`ADMIN_SECRET_KEY=${randomSecret}\n`);
      console.log('Then run this script again.\n');
      process.exit(1);
    }

    // Get user inputs
    const username = await question('Admin username: ');
    const email = await question('Admin email: ');
    const password = await question('Admin password: ');
    const confirmPassword = await question('Confirm password: ');

    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match!\n');
      process.exit(1);
    }

    if (username.length < 3 || username.length > 20) {
      console.log('\n❌ Username must be 3-20 characters!\n');
      process.exit(1);
    }

    if (password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters!\n');
      process.exit(1);
    }

    console.log('\n📡 Connecting to database...\n');

    // Import required modules
    const { connectDB, connectAuthDB, getAuthModels } = require('../config/database');
    const { hashPassword } = require('../utils/bcrypt.util');

    // Connect to databases
    await connectDB();
    await connectAuthDB();

    const { User } = getAuthModels();

    console.log('✅ Connected to databases\n');

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      console.log('❌ Username or email already exists!\n');
      process.exit(1);
    }

    console.log('🔨 Creating admin account...\n');

    // Create admin account
    const adminUser = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      displayName: username,
      isVerified: true, // Mark as verified since we're setting it up
      role: 'admin',
      isCreator: false,
    });

    console.log('✅ Admin account created successfully!\n');
    console.log('📋 Admin Details:');
    console.log(`  Username: ${adminUser.username}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  ID: ${adminUser._id}\n`);

    console.log('🔓 You can now login with:');
    console.log(`  POST /auth/admin/login`);
    console.log(`  {`);
    console.log(`    "username": "${username}",`);
    console.log(`    "password": "your_password_here"`);
    console.log(`  }\n`);

    console.log('🎉 Setup complete! Admin account is ready to use.\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message, '\n');
    rl.close();
    process.exit(1);
  }
}

main();
