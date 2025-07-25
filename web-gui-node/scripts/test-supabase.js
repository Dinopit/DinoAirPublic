/**
 * Simple Supabase Connection Test
 * Tests basic connectivity to Supabase without complex table operations
 */

const { supabase, supabaseAdmin } = require('../lib/supabase');

async function testSupabaseConnection() {
  console.log('🔗 Testing Supabase Connection...\n');

  try {
    // Test 1: Basic connection with anonymous client
    console.log('1. Testing anonymous client connection...');
    const { data: anonData, error: anonError } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);

    if (anonError && anonError.code !== 'PGRST116') {
      console.log('   ⚠️  Anonymous client test skipped:', anonError.message);
    } else {
      console.log('   ✅ Anonymous client connection successful');
    }

    // Test 2: Service role client connection
    console.log('2. Testing service role client connection...');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('_supabase_migrations')
      .select('*')
      .limit(1);

    if (adminError && adminError.code !== 'PGRST116') {
      console.log('   ⚠️  Service role client test skipped:', adminError.message);
    } else {
      console.log('   ✅ Service role client connection successful');
    }

    // Test 3: Check if our tables exist
    console.log('3. Checking if chat tables exist...');
    
    const tables = ['chat_sessions', 'chat_messages', 'chat_metrics'];
    const tableStatus = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116') {
            tableStatus[table] = 'missing';
            console.log(`   ❌ Table '${table}' does not exist`);
          } else {
            tableStatus[table] = 'error';
            console.log(`   ⚠️  Table '${table}' check failed: ${error.message}`);
          }
        } else {
          tableStatus[table] = 'exists';
          console.log(`   ✅ Table '${table}' exists and is accessible`);
        }
      } catch (err) {
        tableStatus[table] = 'error';
        console.log(`   ❌ Error checking table '${table}': ${err.message}`);
      }
    }

    // Summary
    console.log('\n📊 Connection Test Summary:');
    console.log('   Supabase URL:', process.env.SUPABASE_URL);
    console.log('   Anonymous Key:', process.env.SUPABASE_ANON_KEY ? 'Configured' : 'Missing');
    console.log('   Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing');
    
    const existingTables = Object.entries(tableStatus).filter(([_, status]) => status === 'exists').length;
    const missingTables = Object.entries(tableStatus).filter(([_, status]) => status === 'missing').length;
    
    console.log(`   Tables Status: ${existingTables}/3 exist, ${missingTables}/3 missing`);

    if (missingTables > 0) {
      console.log('\n📋 To create missing tables, run these SQL commands in Supabase SQL Editor:');
      console.log('\n-- 1. Create chat_sessions table:');
      console.log(`CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_sessions_user_id_check CHECK (char_length(user_id) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);`);

      console.log('\n-- 2. Create chat_messages table:');
      console.log(`CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_messages_content_check CHECK (char_length(content) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);`);

      console.log('\n-- 3. Create chat_metrics table:');
      console.log(`CREATE TABLE IF NOT EXISTS chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  token_count INTEGER NOT NULL CHECK (token_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_metrics_model_check CHECK (char_length(model) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_metrics_session_id ON chat_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_metrics_created_at ON chat_metrics(created_at);`);
    }

    if (existingTables === 3) {
      console.log('\n🎉 All tables exist! Supabase integration is ready to use.');
      return true;
    } else {
      console.log('\n⚠️  Some tables are missing. Please create them manually in Supabase.');
      return false;
    }

  } catch (error) {
    console.error('\n💥 Connection test failed:', error.message);
    console.log('\nPlease check your Supabase configuration in the .env file.');
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSupabaseConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test script error:', error);
      process.exit(1);
    });
}

module.exports = { testSupabaseConnection };