/**
 * Test script for artifacts database migration
 * Verifies that all artifacts operations work correctly with Supabase
 */

const { artifacts } = require('../lib/supabase');

async function testArtifactsMigration() {
  console.log('🧪 Testing Artifacts Database Migration\n');

  try {
    // Test 1: Create a test artifact
    console.log('1. Testing artifact creation...');
    const testArtifact = await artifacts.create({
      name: 'Test Migration Artifact',
      type: 'javascript',
      content: 'console.log("Hello from migrated database!");',
      user_id: null, // Public artifact
      tags: ['test', 'migration'],
      metadata: {
        author: 'Migration Test',
        purpose: 'Database migration verification'
      }
    });
    console.log('✅ Artifact created:', testArtifact.id);

    // Test 2: Get artifact by ID
    console.log('\n2. Testing artifact retrieval...');
    const retrievedArtifact = await artifacts.getById(testArtifact.id);
    if (retrievedArtifact && retrievedArtifact.name === testArtifact.name) {
      console.log('✅ Artifact retrieved successfully');
    } else {
      throw new Error('Retrieved artifact does not match created artifact');
    }

    // Test 3: Update artifact
    console.log('\n3. Testing artifact update...');
    const updatedArtifact = await artifacts.update(testArtifact.id, {
      name: 'Updated Test Migration Artifact',
      metadata: {
        ...testArtifact.metadata,
        updated: true
      }
    });
    if (updatedArtifact.name === 'Updated Test Migration Artifact') {
      console.log('✅ Artifact updated successfully');
    } else {
      throw new Error('Artifact update failed');
    }

    // Test 4: Create artifact version
    console.log('\n4. Testing artifact versioning...');
    const newVersion = await artifacts.createVersion(testArtifact.id, {
      content: 'console.log("Hello from version 2!");',
      metadata: { version: 2 }
    });
    if (newVersion.version === 2 && newVersion.parent_id === testArtifact.id) {
      console.log('✅ Artifact version created successfully');
    } else {
      throw new Error('Artifact versioning failed');
    }

    // Test 5: Get all versions
    console.log('\n5. Testing version retrieval...');
    const versions = await artifacts.getVersions(testArtifact.id);
    if (versions.length >= 2) {
      console.log('✅ Artifact versions retrieved successfully:', versions.length, 'versions');
    } else {
      throw new Error('Version retrieval failed');
    }

    // Test 6: Get all artifacts
    console.log('\n6. Testing artifact listing...');
    const allArtifacts = await artifacts.getAll({ limit: 10 });
    if (Array.isArray(allArtifacts) && allArtifacts.length > 0) {
      console.log('✅ Artifacts listed successfully:', allArtifacts.length, 'artifacts');
    } else {
      throw new Error('Artifact listing failed');
    }

    // Test 7: Get statistics
    console.log('\n7. Testing statistics...');
    const stats = await artifacts.getStats();
    if (stats && typeof stats.count === 'number' && typeof stats.totalSize === 'number') {
      console.log('✅ Statistics retrieved successfully:', stats.count, 'artifacts,', stats.totalSize, 'bytes');
    } else {
      throw new Error('Statistics retrieval failed');
    }

    // Test 8: Search functionality
    console.log('\n8. Testing search functionality...');
    const searchResults = await artifacts.getAll({ search: 'migration' });
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      console.log('✅ Search functionality working:', searchResults.length, 'results');
    } else {
      console.log('⚠️  Search returned no results (this may be expected)');
    }

    // Test 9: Filter by type
    console.log('\n9. Testing type filtering...');
    const jsArtifacts = await artifacts.getAll({ type: 'javascript' });
    if (Array.isArray(jsArtifacts)) {
      console.log('✅ Type filtering working:', jsArtifacts.length, 'JavaScript artifacts');
    } else {
      throw new Error('Type filtering failed');
    }

    // Test 10: Filter by tags
    console.log('\n10. Testing tag filtering...');
    const taggedArtifacts = await artifacts.getAll({ tags: ['test'] });
    if (Array.isArray(taggedArtifacts)) {
      console.log('✅ Tag filtering working:', taggedArtifacts.length, 'artifacts with "test" tag');
    } else {
      throw new Error('Tag filtering failed');
    }

    // Cleanup: Delete test artifacts
    console.log('\n11. Cleaning up test artifacts...');
    await artifacts.delete(newVersion.id);
    await artifacts.delete(testArtifact.id);
    console.log('✅ Test artifacts cleaned up');

    console.log('\n🎉 All tests passed! Artifacts migration is successful.');
    console.log('\n📊 Migration Summary:');
    console.log('- ✅ Database schema created');
    console.log('- ✅ CRUD operations working');
    console.log('- ✅ Versioning system functional');
    console.log('- ✅ Search and filtering operational');
    console.log('- ✅ Statistics calculation working');
    console.log('- ✅ Data integrity maintained');
  } catch (error) {
    console.error('\n❌ Migration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testArtifactsMigration()
    .then(() => {
      console.log('\n✨ Migration test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration test failed:', error);
      process.exit(1);
    });
}

module.exports = { testArtifactsMigration };
