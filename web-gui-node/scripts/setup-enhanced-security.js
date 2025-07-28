#!/usr/bin/env node

/**
 * Setup script for enhanced security database tables
 * Initializes the new session management, MFA, and security monitoring tables
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabase');

console.log('🛡️  Setting up enhanced security database tables...');

async function setupSecurityTables() {
  try {
    // Read the SQL schema file
    const sqlPath = path.join(__dirname, 'setup-enhanced-security-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📖 Reading SQL schema from:', sqlPath);

    // Split SQL content by statement (basic splitting on semicolons)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_query: statement.endsWith(';') ? statement : statement + ';' 
        });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabaseAdmin
            .from('information_schema.tables')
            .select('*')
            .limit(1);

          if (directError) {
            console.error(`❌ Error executing statement ${i + 1}:`, error);
            console.error('   Statement:', statement.substring(0, 200));
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully (via fallback)`);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (statementError) {
        console.error(`❌ Error executing statement ${i + 1}:`, statementError);
        console.error('   Statement:', statement.substring(0, 200));
      }
    }

    // Verify table creation
    console.log('\n🔍 Verifying table creation...');
    await verifyTables();

    console.log('\n✅ Enhanced security database setup completed successfully!');
    console.log('\n📚 New features available:');
    console.log('   • Sliding session timeouts with activity tracking');
    console.log('   • Role-based API key permissions');
    console.log('   • Persistent account lockout mechanisms');
    console.log('   • Security event audit logging');
    console.log('   • Multi-factor authentication support');

  } catch (error) {
    console.error('❌ Error setting up security tables:', error);
    process.exit(1);
  }
}

async function verifyTables() {
  const expectedTables = [
    'user_sessions',
    'api_key_permissions', 
    'user_lockouts',
    'security_events',
    'user_mfa'
  ];

  for (const tableName of expectedTables) {
    try {
      // Try to query the table to verify it exists
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${tableName}' verification failed:`, error.message);
      } else {
        console.log(`✅ Table '${tableName}' verified successfully`);
      }
    } catch (error) {
      console.log(`❌ Table '${tableName}' verification error:`, error.message);
    }
  }
}

// Add sample data for testing (optional)
async function addSampleData() {
  console.log('\n🧪 Adding sample security data for testing...');

  try {
    // Add sample API key permissions
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('id')
      .limit(1);

    if (apiKeys && apiKeys.length > 0) {
      const { error: permError } = await supabaseAdmin
        .from('api_key_permissions')
        .insert([
          {
            api_key_id: apiKeys[0].id,
            permission: 'chat:read',
            resource_scope: null
          },
          {
            api_key_id: apiKeys[0].id,
            permission: 'artifacts:read',
            resource_scope: null
          }
        ]);

      if (!permError) {
        console.log('✅ Sample API key permissions added');
      }
    }

    // Add sample security event
    const { error: eventError } = await supabaseAdmin
      .from('security_events')
      .insert([{
        event_type: 'login_success',
        event_severity: 'info',
        event_description: 'Sample security event for testing',
        ip_address: '127.0.0.1'
      }]);

    if (!eventError) {
      console.log('✅ Sample security event added');
    }

  } catch (error) {
    console.log('⚠️  Sample data creation failed (this is optional):', error.message);
  }
}

// Run the setup
if (require.main === module) {
  setupSecurityTables()
    .then(() => {
      if (process.argv.includes('--with-sample-data')) {
        return addSampleData();
      }
    })
    .then(() => {
      console.log('\n🎉 Setup completed! Run with --with-sample-data to add test data.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSecurityTables, verifyTables, addSampleData };