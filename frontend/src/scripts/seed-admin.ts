/**
 * Seed Admin User Script
 * Creates a default admin account with hardcoded credentials
 * 
 * Email: admin@artfully.in
 * Password: artfully@123
 * Role: ADMIN
 */

import { createClient } from '@zendbx/sdk'
import * as fs from 'fs'
import * as path from 'path'

// Read .env file
const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')

const getEnvValue = (key: string): string => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : ''
}

const ZENDBX_URL = getEnvValue('VITE_ZENDBX_URL')
const ZENDBX_SERVICE_KEY = getEnvValue('VITE_ZENDBX_SERVICE_KEY')
const PROJECT_SLUG = getEnvValue('VITE_ZENDBX_PROJECT_SLUG')

// Initialize ZendBX client
const db = createClient({
  apiUrl: ZENDBX_URL,
  anonKey: ZENDBX_SERVICE_KEY,
  projectSlug: PROJECT_SLUG,
  storageKey: 'zendbx_seed_token',
})

const ADMIN_EMAIL = 'admin@artfully.in'
const ADMIN_PASSWORD = 'artfully@123'

async function seedAdmin() {
  console.log('🌱 Seeding admin user...')
  console.log('📡 ZendBX URL:', ZENDBX_URL)
  console.log('📦 Project:', PROJECT_SLUG)
  console.log('')

  try {
    // Step 1: Check if admin already exists in user_profiles
    console.log('🔍 Checking if admin exists...')
    const { data: existingProfile } = await db
      .from('user_profiles')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single()

    if (existingProfile) {
      console.log('✅ Admin user already exists!')
      console.log('📧 Email:', ADMIN_EMAIL)
      console.log('🔑 Password: artfully@123')
      return
    }

    // Step 2: Create admin in ZendBX auth
    console.log('🔐 Creating admin auth user...')
    const signUpResponse = await db.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: 'Admin User',
    })

    console.log('📦 Full signup response:', JSON.stringify(signUpResponse, null, 2))

    const authData = signUpResponse?.data || signUpResponse
    const signUpError = signUpResponse?.error

    if (signUpError) {
      console.error('❌ Auth signup error:', signUpError)
      throw signUpError
    }

    console.log('✅ Auth data:', authData)

    // Try different ways to get the user ID
    const authUserId = authData?.user?.id || authData?.id || authData?.sub

    if (!authUserId) {
      console.error('❌ Could not find user ID in response')
      console.log('💡 Check ZendBX Console → Authentication to see if user was created')
      console.log('💡 If user exists, get the ID and run this SQL:')
      console.log(`
INSERT INTO user_profiles (auth_user_id, email, first_name, last_name, role, is_active)
VALUES ('<USER_ID_HERE>', '${ADMIN_EMAIL}', 'Admin', 'User', 'ADMIN', true);
      `)
      throw new Error('Failed to get auth user ID from signup response')
    }

    // Step 3: Create profile in user_profiles
    console.log('👤 Creating admin profile...')
    const { data: profileData, error: profileError } = await db
      .from('user_profiles')
      .insert({
        auth_user_id: authUserId,
        email: ADMIN_EMAIL,
        first_name: 'Admin',
        last_name: 'User',
        phone: null,
        role: 'ADMIN',
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      throw profileError
    }

    console.log('✅ Admin profile created:', profileData)

    console.log('')
    console.log('🎉 Admin user seeded successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:    ', ADMIN_EMAIL)
    console.log('🔑 Password: ', ADMIN_PASSWORD)
    console.log('👑 Role:     ', 'ADMIN')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('You can now login at: http://localhost:5173/login')

  } catch (error: any) {
    console.error('❌ Error seeding admin:', error)
    console.error('Message:', error?.message)
  }
}

// Run the seed function
seedAdmin()
