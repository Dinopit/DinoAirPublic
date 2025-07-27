/**
 * Database Migration: Add Knowledge Base Tables
 * Extends the existing Supabase schema with knowledge management capabilities
 */

const { supabaseAdmin } = require('../lib/supabase');

/**
 * SQL to create the knowledge_base table
 */
const createKnowledgeBaseTable = `
-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_base table for storing extracted knowledge
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id UUID,
  message_id UUID,
  content TEXT NOT NULL,
  embedding vector(384), -- 384-dimensional vector for embeddings
  entities JSONB DEFAULT '[]'::jsonb,
  facts JSONB DEFAULT '[]'::jsonb,
  relationships JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_session_id ON knowledge_base(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_entities ON knowledge_base USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_facts ON knowledge_base USING GIN(facts);

-- Vector similarity search index (if vector extension is available)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- Create user_memory_settings table for privacy controls
CREATE TABLE IF NOT EXISTS user_memory_settings (
  user_id TEXT PRIMARY KEY,
  memory_enabled BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT NULL, -- NULL means indefinite
  share_anonymized BOOLEAN DEFAULT false,
  auto_extract BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge_search_history table to track searches
CREATE TABLE IF NOT EXISTS knowledge_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  search_type TEXT DEFAULT 'semantic', -- semantic, entity, fact
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for search history
CREATE INDEX IF NOT EXISTS idx_knowledge_search_user_id ON knowledge_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_search_created_at ON knowledge_search_history(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_search_history ENABLE ROW LEVEL SECURITY;

-- Policies for knowledge_base
CREATE POLICY "Users can only access their own knowledge" 
ON knowledge_base FOR ALL 
USING (auth.uid()::text = user_id);

-- Policies for user_memory_settings
CREATE POLICY "Users can only access their own memory settings" 
ON user_memory_settings FOR ALL 
USING (auth.uid()::text = user_id);

-- Policies for knowledge_search_history
CREATE POLICY "Users can only access their own search history" 
ON knowledge_search_history FOR ALL 
USING (auth.uid()::text = user_id);

-- Create functions for maintenance
CREATE OR REPLACE FUNCTION cleanup_old_knowledge()
RETURNS void AS $$
BEGIN
  -- Delete knowledge older than user's retention settings
  DELETE FROM knowledge_base kb
  WHERE EXISTS (
    SELECT 1 FROM user_memory_settings ums 
    WHERE ums.user_id = kb.user_id 
    AND ums.retention_days IS NOT NULL
    AND kb.created_at < NOW() - (ums.retention_days || ' days')::interval
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get memory statistics
CREATE OR REPLACE FUNCTION get_memory_stats(p_user_id TEXT)
RETURNS TABLE (
  total_memories BIGINT,
  total_entities BIGINT,
  total_facts BIGINT,
  earliest_memory TIMESTAMPTZ,
  latest_memory TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_memories,
    COALESCE(SUM(jsonb_array_length(entities)), 0) as total_entities,
    COALESCE(SUM(jsonb_array_length(facts)), 0) as total_facts,
    MIN(created_at) as earliest_memory,
    MAX(created_at) as latest_memory
  FROM knowledge_base 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
`;

/**
 * SQL to rollback changes (for testing)
 */
const rollbackSQL = `
DROP FUNCTION IF EXISTS get_memory_stats(TEXT);
DROP FUNCTION IF EXISTS cleanup_old_knowledge();
DROP TABLE IF EXISTS knowledge_search_history;
DROP TABLE IF EXISTS user_memory_settings;
DROP TABLE IF EXISTS knowledge_base;
`;

/**
 * Run the migration
 */
async function runMigration() {
  try {
    console.log('🚀 Starting knowledge base migration...');
    
    // Check if we have admin access
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️  No service role key found. Migration requires admin access.');
      console.log('📝 Please run the following SQL manually in your Supabase dashboard:');
      console.log('\n' + createKnowledgeBaseTable + '\n');
      return false;
    }
    
    // Execute the migration
    // Note: The 'exec' RPC function must exist in your Supabase setup for this to work.
    // If it does not exist, you can create it by running the following SQL in your Supabase dashboard:
    // CREATE OR REPLACE FUNCTION exec(sql TEXT) RETURNS VOID AS $$
    // BEGIN
    //   EXECUTE sql;
    // END;
    // $$ LANGUAGE plpgsql SECURITY DEFINER;
    // Ensure the function is owned by the role used by your Supabase instance.
    const { error } = await supabaseAdmin.rpc('exec', {
      sql: createKnowledgeBaseTable
    });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      
      // If RPC is not available, log the SQL for manual execution
      if (error.code === 'PGRST202' || error.message.includes('function "exec" does not exist')) {
        console.log('📝 Please run the following SQL manually in your Supabase dashboard:');
        console.log('\n' + createKnowledgeBaseTable + '\n');
        return false;
      }
      
      throw error;
    }
    
    console.log('✅ Knowledge base migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.log('📝 Please run the following SQL manually in your Supabase dashboard:');
    console.log('\n' + createKnowledgeBaseTable + '\n');
    return false;
  }
}

/**
 * Test the migration by checking if tables exist
 */
async function testMigration() {
  try {
    console.log('🧪 Testing migration...');
    
    // Test if knowledge_base table exists
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('❌ knowledge_base table does not exist');
      return false;
    }
    
    if (error) {
      console.error('❌ Error testing table:', error.message);
      return false;
    }
    
    console.log('✅ knowledge_base table exists and is accessible');
    
    // Test user_memory_settings table
    const { error: settingsError } = await supabaseAdmin
      .from('user_memory_settings')
      .select('user_id')
      .limit(1);
    
    if (settingsError && settingsError.code === 'PGRST116') {
      console.log('❌ user_memory_settings table does not exist');
      return false;
    }
    
    if (settingsError) {
      console.error('❌ Error testing settings table:', settingsError.message);
      return false;
    }
    
    console.log('✅ user_memory_settings table exists and is accessible');
    console.log('✅ Migration test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    return false;
  }
}

/**
 * Rollback the migration (for development/testing)
 */
async function rollback() {
  try {
    console.log('🔄 Rolling back migration...');
    
    const { error } = await supabaseAdmin.rpc('exec', {
      sql: rollbackSQL
    });
    
    if (error) {
      console.error('❌ Rollback failed:', error.message);
      console.log('📝 Please run the following SQL manually:');
      console.log('\n' + rollbackSQL + '\n');
      return false;
    }
    
    console.log('✅ Migration rolled back successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Rollback error:', error);
    return false;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'rollback':
      rollback().then(success => process.exit(success ? 0 : 1));
      break;
    case 'test':
      testMigration().then(success => process.exit(success ? 0 : 1));
      break;
    default:
      runMigration().then(success => process.exit(success ? 0 : 1));
  }
}

module.exports = {
  runMigration,
  testMigration,
  rollback,
  createKnowledgeBaseTable,
  rollbackSQL
};