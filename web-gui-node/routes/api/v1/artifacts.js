/**
 * V1 Artifacts API Routes
 * Artifact management and export functionality
 */

const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const { artifacts } = require('../../../lib/supabase');
const { resourceManager } = require('../../../lib/resource-manager');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common text and code file types
    const allowedTypes = [
      'text/plain',
      'application/json',
      'text/javascript',
      'text/html',
      'text/css',
      'application/javascript'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(txt|js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|cs|php|rb|go|rs|swift|kt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text and code files are allowed.'));
    }
  }
});

// Configuration constants
const MAX_ARTIFACTS = 1000;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Get current storage statistics from database
 */
async function getStorageStats(userId = null) {
  try {
    const stats = await artifacts.getStats(userId);
    return {
      count: stats.count,
      maxCount: MAX_ARTIFACTS,
      totalSize: stats.totalSize,
      maxSize: MAX_TOTAL_SIZE,
      utilizationPercent: {
        count: Math.round((stats.count / MAX_ARTIFACTS) * 100),
        size: Math.round((stats.totalSize / MAX_TOTAL_SIZE) * 100)
      }
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      count: 0,
      maxCount: MAX_ARTIFACTS,
      totalSize: 0,
      maxSize: MAX_TOTAL_SIZE,
      utilizationPercent: { count: 0, size: 0 }
    };
  }
}

// GET /api/v1/artifacts - Get all artifacts
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      search, 
      tags,
      user_id
    } = req.query;

    const offset = (page - 1) * limit;
    const options = {
      limit: parseInt(limit),
      offset: offset,
      type,
      search,
      user_id
    };

    // Parse tags if provided
    if (tags) {
      options.tags = Array.isArray(tags) ? tags : tags.split(',');
    }

    // Get artifacts from database
    const artifactsList = await artifacts.getAll(options);
    
    // Get total count for pagination (simplified - in production, use a separate count query)
    const allArtifacts = await artifacts.getAll({ user_id });
    const total = allArtifacts.length;

    // Get storage stats
    const stats = await getStorageStats(user_id);

    res.json({
      success: true,
      artifacts: artifactsList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        type,
        search,
        tags,
        user_id
      },
      stats
    });
  } catch (error) {
    console.error('Error getting artifacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve artifacts',
      message: error.message
    });
  }
});

// GET /api/v1/artifacts/:id - Get specific artifact
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const artifact = await artifacts.getById(id);

    if (!artifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    res.json({
      success: true,
      artifact
    });
  } catch (error) {
    console.error('Error getting artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve artifact',
      message: error.message
    });
  }
});

// POST /api/v1/artifacts - Create new artifact
router.post('/', async (req, res) => {
  try {
    const { name, type, content, tags = [], metadata = {}, user_id } = req.body;

    if (!name || !type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and content are required'
      });
    }

    const artifactSize = Buffer.byteLength(content, 'utf8');
    const currentStats = await getStorageStats(user_id);
    
    if (currentStats.count >= MAX_ARTIFACTS) {
      return res.status(413).json({
        success: false,
        error: 'Maximum artifact count reached',
        details: {
          current: currentStats.count,
          maximum: MAX_ARTIFACTS,
          message: 'Please delete some artifacts before creating new ones'
        }
      });
    }

    if (currentStats.totalSize + artifactSize > MAX_TOTAL_SIZE) {
      return res.status(413).json({
        success: false,
        error: 'Maximum storage size would be exceeded',
        details: {
          currentSize: Math.round(currentStats.totalSize / 1024 / 1024),
          artifactSize: Math.round(artifactSize / 1024 / 1024),
          maximumSize: Math.round(MAX_TOTAL_SIZE / 1024 / 1024),
          message: 'Artifact too large or storage nearly full'
        }
      });
    }

    // Create artifact in database
    const newArtifact = await artifacts.create({
      name,
      type,
      content,
      user_id: user_id || null,
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        author: 'User',
        ...metadata
      }
    });

    // Get updated storage stats
    const updatedStats = await getStorageStats(user_id);

    res.status(201).json({
      success: true,
      artifact: newArtifact,
      storageStats: updatedStats
    });
  } catch (error) {
    console.error('Error creating artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create artifact',
      message: error.message
    });
  }
});

// PUT /api/v1/artifacts/:id - Update artifact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, tags, metadata } = req.body;

    // Check if artifact exists
    const existingArtifact = await artifacts.getById(id);
    if (!existingArtifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    // Prepare update data
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (metadata !== undefined) updates.metadata = { ...existingArtifact.metadata, ...metadata };

    // Update artifact in database
    const updatedArtifact = await artifacts.update(id, updates);

    res.json({
      success: true,
      artifact: updatedArtifact
    });
  } catch (error) {
    console.error('Error updating artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update artifact',
      message: error.message
    });
  }
});

// DELETE /api/v1/artifacts/:id - Delete artifact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if artifact exists
    const existingArtifact = await artifacts.getById(id);
    if (!existingArtifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    // Delete artifact from database
    await artifacts.delete(id);

    res.json({
      success: true,
      message: 'Artifact deleted successfully',
      artifact: existingArtifact
    });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete artifact',
      message: error.message
    });
  }
});

// POST /api/v1/artifacts/:id/versions - Create new version of artifact
router.post('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, tags, metadata } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required for new version'
      });
    }

    // Create new version
    const newVersion = await artifacts.createVersion(id, {
      name,
      type,
      content,
      tags,
      metadata
    });

    res.status(201).json({
      success: true,
      artifact: newVersion,
      message: 'New artifact version created successfully'
    });
  } catch (error) {
    console.error('Error creating artifact version:', error);
    if (error.message === 'Parent artifact not found') {
      return res.status(404).json({
        success: false,
        error: 'Parent artifact not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create artifact version',
      message: error.message
    });
  }
});

// GET /api/v1/artifacts/:id/versions - Get all versions of artifact
router.get('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;

    const versions = await artifacts.getVersions(id);

    if (versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    res.json({
      success: true,
      versions: versions,
      total: versions.length
    });
  } catch (error) {
    console.error('Error getting artifact versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve artifact versions',
      message: error.message
    });
  }
});

// POST /api/v1/artifacts/bulk-import - Import multiple artifacts
router.post('/bulk-import', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const { user_id } = req.body;
    const importedArtifacts = [];
    const errors = [];

    // Map file extensions to types
    const typeMap = {
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'text'
    };

    // Process each file
    for (const file of req.files) {
      try {
        const content = file.buffer.toString('utf8');
        const fileExtension = file.originalname.split('.').pop().toLowerCase();

        const artifactData = {
          name: file.originalname,
          type: typeMap[fileExtension] || 'text',
          content,
          user_id: user_id || null,
          tags: ['imported'],
          metadata: {
            author: 'Import',
            originalFilename: file.originalname,
            importedAt: new Date().toISOString()
          }
        };

        // Create artifact in database
        const createdArtifact = await artifacts.create(artifactData);
        importedArtifacts.push(createdArtifact);
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      imported: importedArtifacts.length,
      artifacts: importedArtifacts,
      errors
    });
  } catch (error) {
    console.error('Error importing artifacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import artifacts',
      message: error.message
    });
  }
});

// GET /api/v1/artifacts/export/single/:id - Export single artifact
router.get('/export/single/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const artifact = await artifacts.getById(id);

    if (!artifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    // Determine file extension
    const extensionMap = {
      'javascript': '.js',
      'javascriptreact': '.jsx',
      'typescript': '.ts',
      'typescriptreact': '.tsx',
      'python': '.py',
      'html': '.html',
      'css': '.css',
      'json': '.json',
      'markdown': '.md',
      'text': '.txt'
    };

    const extension = extensionMap[artifact.type] || '.txt';
    const filename = artifact.name.endsWith(extension) ? artifact.name : artifact.name + extension;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(artifact.content);
  } catch (error) {
    console.error('Error exporting artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export artifact',
      message: error.message
    });
  }
});

// POST /api/v1/artifacts/export/bulk - Export multiple artifacts as ZIP
router.post('/export/bulk', async (req, res) => {
  try {
    const { artifactIds, includeManifest = true } = req.body;

    if (!artifactIds || !Array.isArray(artifactIds) || artifactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Artifact IDs array is required'
      });
    }

    // Fetch artifacts from database
    const selectedArtifacts = [];
    for (const id of artifactIds) {
      try {
        const artifact = await artifacts.getById(id);
        if (artifact) {
          selectedArtifacts.push(artifact);
        }
      } catch (error) {
        console.error(`Error fetching artifact ${id}:`, error);
      }
    }

    if (selectedArtifacts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No artifacts found with provided IDs'
      });
    }

    const zip = new JSZip();

    // Add artifacts to ZIP
    selectedArtifacts.forEach(artifact => {
      const extensionMap = {
        'javascript': '.js',
        'javascriptreact': '.jsx',
        'typescript': '.ts',
        'typescriptreact': '.tsx',
        'python': '.py',
        'html': '.html',
        'css': '.css',
        'json': '.json',
        'markdown': '.md',
        'text': '.txt'
      };

      const extension = extensionMap[artifact.type] || '.txt';
      const filename = artifact.name.endsWith(extension) ? artifact.name : artifact.name + extension;
      
      zip.file(filename, artifact.content);
    });

    // Add manifest if requested
    if (includeManifest) {
      const manifest = {
        exportDate: new Date().toISOString(),
        totalArtifacts: selectedArtifacts.length,
        artifacts: selectedArtifacts.map(artifact => ({
          id: artifact.id,
          name: artifact.name,
          type: artifact.type,
          createdAt: artifact.createdAt,
          size: artifact.size,
          tags: artifact.tags
        }))
      };
      
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="dinoair-artifacts.zip"');
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export artifacts',
      message: error.message
    });
  }
});

// GET /api/v1/artifacts/stats - Get artifact statistics
router.get('/stats', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // Get storage stats from database
    const storageStats = await getStorageStats(user_id);
    
    // Get all artifacts to calculate detailed stats
    const allArtifacts = await artifacts.getAll({ user_id });
    
    const stats = {
      total: allArtifacts.length,
      byType: {},
      totalSize: storageStats.totalSize,
      averageSize: 0,
      recentCount: 0,
      storage: {
        limits: {
          maxArtifacts: MAX_ARTIFACTS,
          maxTotalSize: MAX_TOTAL_SIZE,
          maxTotalSizeMB: Math.round(MAX_TOTAL_SIZE / 1024 / 1024)
        },
        current: {
          artifacts: storageStats.count,
          totalSize: storageStats.totalSize,
          totalSizeMB: Math.round(storageStats.totalSize / 1024 / 1024)
        },
        utilization: storageStats.utilizationPercent,
        status: storageStats.utilizationPercent.count > 90 || storageStats.utilizationPercent.size > 90 
          ? 'critical' 
          : storageStats.utilizationPercent.count > 70 || storageStats.utilizationPercent.size > 70 
          ? 'warning' 
          : 'healthy'
      }
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    allArtifacts.forEach(artifact => {
      // Count by type
      stats.byType[artifact.type] = (stats.byType[artifact.type] || 0) + 1;
      
      // Recent artifacts (last week)
      if (new Date(artifact.created_at) > oneWeekAgo) {
        stats.recentCount++;
      }
    });

    stats.averageSize = allArtifacts.length > 0 ? Math.round(stats.totalSize / allArtifacts.length) : 0;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting artifact stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve artifact statistics',
      message: error.message
    });
  }
});

module.exports = router;
