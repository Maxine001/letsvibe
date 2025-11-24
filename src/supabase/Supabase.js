import { createClient } from '@supabase/supabase-js'

// These environment variables should be defined in your project environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
// Read bucket name from environment or default to 'profile_image'
const storageBucketName = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'profile_image'
export const STORAGE_BUCKET = storageBucketName

console.log("Current Supabase STORAGE_BUCKET:", STORAGE_BUCKET);

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseAnonKey)


/**
 * Add a new user to the "users" table.
 * @param {Object} user - User details object with properties: name, status, profileImgUrl
 * @returns {Object} Result of the insert operation
 */
export async function addUser(user) {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: user.id,  // added id here
        name: user.name,
        status: user.status,
        profile_img_url: user.profileImgUrl || '',
        connections: user.connections || [],
        is_online: user.isOnline || false,
      }
    ])
    .select()

  if (error) {
    console.error("Supabase insert error details:", error);
    throw error
  }
  return data
}

/**
 * Check if a username exists in the "users" table.
 * @param {string} username - The username to check for existence
 * @returns {boolean} true if username exists, false otherwise
 */
export async function usernameExists(username) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('name', username)
    .limit(1)

  if (error) {
    throw error
  }
  return data.length > 0
}

/**
 * Fetch all users from the "users" table.
 * @returns {Array} List of users
 */
export async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')

  if (error) {
    throw error
  }
  return data
}

export const DB = supabase;
export const DBStorage = supabase.storage;

export default supabase;
