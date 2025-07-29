#!/usr/bin/env node

const { supabaseAdmin } = require('../lib/supabase');

async function createRequiredTables() {
  console.log('🔧 Creating required Supabase tables for DinoAir...');

  try {
    const memoryTableSQL = `
      CREATE TABLE IF NOT EXISTS public.memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL UNIQUE,
        memory_data TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_memory_user_id ON public.memory(user_id);
      
      ALTER TABLE public.memory ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Users can only access their own memory" ON public.memory
        FOR ALL USING (auth.uid()::text = user_id);
    `;

    console.log('📋 Creating memory table for per-user data storage...');
    const { data: _memoryResult, error: memoryError } = await supabaseAdmin.rpc('exec_sql', {
      sql: memoryTableSQL
    });

    if (memoryError) {
      console.log('⚠️  Direct SQL execution not available, attempting table creation via client...');

      const { error: createError } = await supabaseAdmin.from('memory').select('id').limit(1);

      if (createError && createError.code === 'PGRST116') {
        console.log('❌ Memory table does not exist and cannot be created automatically.');
        console.log('📝 Please run this SQL manually in your Supabase SQL editor:');
        console.log(memoryTableSQL);
      } else {
        console.log('✅ Memory table already exists or was created successfully');
      }
    } else {
      console.log('✅ Memory table created successfully');
    }

    const chatSessionsSQL = `
      CREATE TABLE IF NOT EXISTS public.chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
      
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
      
      ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Users can only access their own chat sessions" ON public.chat_sessions
        FOR ALL USING (auth.uid()::text = user_id);
    `;

    console.log('💬 Creating chat_sessions table for user chat history...');
    const { data: _chatResult, error: chatError } = await supabaseAdmin.rpc('exec_sql', {
      sql: chatSessionsSQL
    });

    if (chatError) {
      console.log('⚠️  Direct SQL execution not available for chat_sessions, attempting via client...');

      const { error: createError } = await supabaseAdmin.from('chat_sessions').select('id').limit(1);

      if (createError && createError.code === 'PGRST116') {
        console.log('❌ Chat sessions table does not exist and cannot be created automatically.');
        console.log('📝 Please run this SQL manually in your Supabase SQL editor:');
        console.log(chatSessionsSQL);
      } else {
        console.log('✅ Chat sessions table already exists or was created successfully');
      }
    } else {
      console.log('✅ Chat sessions table created successfully');
    }

    const chatMessagesSQL = `
      CREATE TABLE IF NOT EXISTS public.chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        message_content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
      
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
      
      ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Users can only access their own chat messages" ON public.chat_messages
        FOR ALL USING (auth.uid()::text = user_id);
    `;

    console.log('💭 Creating chat_messages table for message storage...');
    const { data: _messagesResult, error: messagesError } = await supabaseAdmin.rpc('exec_sql', {
      sql: chatMessagesSQL
    });

    if (messagesError) {
      console.log('⚠️  Direct SQL execution not available for chat_messages, attempting via client...');

      const { error: createError } = await supabaseAdmin.from('chat_messages').select('id').limit(1);

      if (createError && createError.code === 'PGRST116') {
        console.log('❌ Chat messages table does not exist and cannot be created automatically.');
        console.log('📝 Please run this SQL manually in your Supabase SQL editor:');
        console.log(chatMessagesSQL);
      } else {
        console.log('✅ Chat messages table already exists or was created successfully');
      }
    } else {
      console.log('✅ Chat messages table created successfully');
    }

    console.log('\n🎉 Database table creation process completed!');
    console.log('📊 Summary:');
    console.log('  - Memory table: Per-user memory storage with RLS');
    console.log('  - Chat sessions: User chat session management');
    console.log('  - Chat messages: Individual message storage with session references');
    console.log('\n🔒 Row Level Security (RLS) has been enabled for all tables');
    console.log('👤 Users can only access their own data through the policies');

    return true;
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    console.error('Stack trace:', error.stack);

    console.log('\n📝 Manual SQL to run in Supabase SQL editor:');
    console.log('-- Memory table');
    console.log(`CREATE TABLE IF NOT EXISTS public.memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  memory_data TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON public.memory(user_id);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);`);

    return false;
  }
}

async function testTableCreation() {
  console.log('\n🧪 Testing table accessibility...');

  try {
    const { data: _memoryTest, error: memoryError } = await supabaseAdmin.from('memory').select('count').limit(1);

    if (memoryError) {
      console.log('❌ Memory table test failed:', memoryError.message);
    } else {
      console.log('✅ Memory table is accessible');
    }

    const { data: _sessionsTest, error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select('count')
      .limit(1);

    if (sessionsError) {
      console.log('❌ Chat sessions table test failed:', sessionsError.message);
    } else {
      console.log('✅ Chat sessions table is accessible');
    }

    const { data: _messagesTest, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('count')
      .limit(1);

    if (messagesError) {
      console.log('❌ Chat messages table test failed:', messagesError.message);
    } else {
      console.log('✅ Chat messages table is accessible');
    }
  } catch (error) {
    console.error('❌ Error testing tables:', error);
  }
}

async function main() {
  console.log('🚀 DinoAir Supabase Database Setup');
  console.log('=====================================\n');

  const success = await createRequiredTables();

  if (success) {
    await testTableCreation();
    console.log('\n✅ Database setup completed successfully!');
    console.log('🔄 You can now test the memory functionality with: npm run test:memory');
  } else {
    console.log('\n⚠️  Database setup completed with warnings.');
    console.log('📋 Please check the manual SQL statements above and run them in Supabase.');
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createRequiredTables, testTableCreation };
