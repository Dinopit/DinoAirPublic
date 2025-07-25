/**
 * V1 Artifacts API Routes
 * Artifact management and export functionality
 */

const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
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

// In-memory artifact storage (in production, use database)
let artifacts = [
  {
    id: '1',
    name: 'Sample React Component',
    type: 'javascript',
    content: `import React from 'react';

const SampleComponent = ({ title, children }) => {
  return (
    <div className="sample-component">
      <h2>{title}</h2>
      <div className="content">
        {children}
      </div>
    </div>
  );
};

export default SampleComponent;`,
    createdAt: new Date('2025-01-20T10:00:00Z'),
    updatedAt: new Date('2025-01-20T10:00:00Z'),
    size: 245,
    tags: ['react', 'component', 'sample'],
    metadata: {
      language: 'javascript',
      framework: 'react',
      author: 'DinoAir AI'
    }
  },
  {
    id: '2',
    name: 'Python Data Analysis Script',
    type: 'python',
    content: `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def analyze_data(file_path):
    """
    Analyze data from CSV file and generate insights
    """
    # Load data
    df = pd.read_csv(file_path)
    
    # Basic statistics
    stats = df.describe()
    
    # Generate visualization
    plt.figure(figsize=(10, 6))
    df.hist(bins=20, alpha=0.7)
    plt.title('Data Distribution')
    plt.tight_layout()
    plt.show()
    
    return stats

if __name__ == "__main__":
    results = analyze_data("data.csv")
    print(results)`,
    createdAt: new Date('2025-01-19T15:30:00Z'),
    updatedAt: new Date('2025-01-19T15:30:00Z'),
    size: 512,
    tags: ['python', 'data-analysis', 'pandas'],
    metadata: {
      language: 'python',
      libraries: ['pandas', 'numpy', 'matplotlib'],
      author: 'DinoAir AI'
    }
  }
];

let nextId = 3;

// GET /api/v1/artifacts - Get all artifacts
router.get('/', (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    type, 
    search, 
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  let filteredArtifacts = [...artifacts];

  // Filter by type
  if (type) {
    filteredArtifacts = filteredArtifacts.filter(artifact => 
      artifact.type.toLowerCase() === type.toLowerCase()
    );
  }

  // Search in name and content
  if (search) {
    const searchLower = search.toLowerCase();
    filteredArtifacts = filteredArtifacts.filter(artifact =>
      artifact.name.toLowerCase().includes(searchLower) ||
      artifact.content.toLowerCase().includes(searchLower) ||
      artifact.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // Sort artifacts
  filteredArtifacts.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1;
    } else {
      return aValue > bValue ? 1 : -1;
    }
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedArtifacts = filteredArtifacts.slice(startIndex, endIndex);

  res.json({
    success: true,
    artifacts: paginatedArtifacts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredArtifacts.length,
      pages: Math.ceil(filteredArtifacts.length / limit)
    },
    filters: {
      type,
      search,
      sortBy,
      sortOrder
    }
  });
});

// GET /api/v1/artifacts/:id - Get specific artifact
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const artifact = artifacts.find(a => a.id === id);

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
});

// POST /api/v1/artifacts - Create new artifact
router.post('/', (req, res) => {
  try {
    const { name, type, content, tags = [], metadata = {} } = req.body;

    if (!name || !type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and content are required'
      });
    }

    const newArtifact = {
      id: nextId.toString(),
      name,
      type,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      size: content.length,
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        author: 'User',
        ...metadata
      }
    };

    artifacts.push(newArtifact);
    nextId++;

    res.status(201).json({
      success: true,
      artifact: newArtifact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create artifact',
      message: error.message
    });
  }
});

// PUT /api/v1/artifacts/:id - Update artifact
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, tags, metadata } = req.body;

    const artifactIndex = artifacts.findIndex(a => a.id === id);
    if (artifactIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    const artifact = artifacts[artifactIndex];
    
    // Update fields
    if (name !== undefined) artifact.name = name;
    if (type !== undefined) artifact.type = type;
    if (content !== undefined) {
      artifact.content = content;
      artifact.size = content.length;
    }
    if (tags !== undefined) artifact.tags = Array.isArray(tags) ? tags : [];
    if (metadata !== undefined) artifact.metadata = { ...artifact.metadata, ...metadata };
    
    artifact.updatedAt = new Date();

    res.json({
      success: true,
      artifact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update artifact',
      message: error.message
    });
  }
});

// DELETE /api/v1/artifacts/:id - Delete artifact
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const artifactIndex = artifacts.findIndex(a => a.id === id);

  if (artifactIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Artifact not found'
    });
  }

  const deletedArtifact = artifacts.splice(artifactIndex, 1)[0];

  res.json({
    success: true,
    message: 'Artifact deleted successfully',
    artifact: deletedArtifact
  });
});

// POST /api/v1/artifacts/bulk-import - Import multiple artifacts
router.post('/bulk-import', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const importedArtifacts = [];
    const errors = [];

    req.files.forEach((file, index) => {
      try {
        const content = file.buffer.toString('utf8');
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        
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

        const artifact = {
          id: nextId.toString(),
          name: file.originalname,
          type: typeMap[fileExtension] || 'text',
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
          size: content.length,
          tags: ['imported'],
          metadata: {
            author: 'Import',
            originalFilename: file.originalname,
            importedAt: new Date().toISOString()
          }
        };

        artifacts.push(artifact);
        importedArtifacts.push(artifact);
        nextId++;
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message
        });
      }
    });

    res.json({
      success: true,
      imported: importedArtifacts.length,
      artifacts: importedArtifacts,
      errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to import artifacts',
      message: error.message
    });
  }
});

// GET /api/v1/artifacts/export/single/:id - Export single artifact
router.get('/export/single/:id', (req, res) => {
  const { id } = req.params;
  const artifact = artifacts.find(a => a.id === id);

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

    const selectedArtifacts = artifacts.filter(a => artifactIds.includes(a.id));

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
router.get('/stats', (req, res) => {
  const stats = {
    total: artifacts.length,
    byType: {},
    totalSize: 0,
    averageSize: 0,
    recentCount: 0
  };

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  artifacts.forEach(artifact => {
    // Count by type
    stats.byType[artifact.type] = (stats.byType[artifact.type] || 0) + 1;
    
    // Total size
    stats.totalSize += artifact.size;
    
    // Recent artifacts (last week)
    if (new Date(artifact.createdAt) > oneWeekAgo) {
      stats.recentCount++;
    }
  });

  stats.averageSize = artifacts.length > 0 ? Math.round(stats.totalSize / artifacts.length) : 0;

  res.json({
    success: true,
    stats
  });
});

module.exports = router;