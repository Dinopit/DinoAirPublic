/**
 * Project Management API Routes
 * RESTful API for managing multi-file code projects
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { VirtualFileSystem } = require('../../lib/virtual-file-system');
const rateLimit = require('express-rate-limit');

// Initialize virtual file system
const vfs = new VirtualFileSystem();

// Mock authentication middleware for simple testing
const authenticateRequest = (req, res, next) => {
  req.user = req.user || { id: 'test-user', name: 'Test User' };
  next();
};

// Rate limiting for project operations
const projectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 operations per minute per IP
  message: {
    error: 'Too many project operations',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateProject = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name is required and must be between 1-100 characters'),
  body('language')
    .isString()
    .isIn(['python', 'javascript', 'java', 'cpp', 'go', 'rust'])
    .withMessage('Language must be one of: python, javascript, java, cpp, go, rust')
];

const validateFile = [
  body('fileName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('File name must be valid and contain only alphanumeric characters, dots, underscores, and hyphens'),
  body('content')
    .isString()
    .isLength({ max: 1000000 }) // 1MB limit
    .withMessage('File content must be a string and not exceed 1MB')
];

const validateProjectId = [
  param('projectId')
    .isUUID()
    .withMessage('Project ID must be a valid UUID')
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/',
  authenticateRequest,
  projectLimiter,
  validateProject,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, language } = req.body;
      const userId = req.user.id;
      
      const project = await vfs.createProject(userId, name, language);
      
      res.status(201).json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          language: project.language,
          createdAt: project.createdAt,
          lastModified: project.lastModified
        }
      });
    } catch (error) {
      console.error('Project creation error:', error);
      res.status(500).json({
        error: 'Failed to create project',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/projects
 * List user's projects
 */
router.get('/',
  authenticateRequest,
  (req, res) => {
    try {
      const userId = req.user.id;
      const projects = vfs.listProjects(userId);
      
      res.json({
        success: true,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          language: p.language,
          createdAt: p.createdAt,
          lastModified: p.lastModified,
          fileCount: p.files.size,
          dependencyCount: p.dependencies.length
        }))
      });
    } catch (error) {
      console.error('Project listing error:', error);
      res.status(500).json({
        error: 'Failed to list projects',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/projects/:projectId
 * Get project details
 */
router.get('/:projectId',
  authenticateRequest,
  validateProjectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = vfs.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }
      
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      const files = await vfs.listFiles(projectId);
      
      res.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          language: project.language,
          createdAt: project.createdAt,
          lastModified: project.lastModified,
          files,
          dependencies: project.dependencies
        }
      });
    } catch (error) {
      console.error('Project details error:', error);
      res.status(500).json({
        error: 'Failed to get project details',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/projects/:projectId
 * Delete a project
 */
router.delete('/:projectId',
  authenticateRequest,
  validateProjectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = vfs.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }
      
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      await vfs.deleteProject(projectId);
      
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Project deletion error:', error);
      res.status(500).json({
        error: 'Failed to delete project',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/projects/:projectId/files
 * Create or update a file in the project
 */
router.post('/:projectId/files',
  authenticateRequest,
  projectLimiter,
  validateProjectId,
  validateFile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { fileName, content } = req.body;
      
      const project = vfs.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }
      
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      await vfs.writeFile(projectId, fileName, content);
      
      res.json({
        success: true,
        message: 'File saved successfully',
        file: {
          name: fileName,
          size: Buffer.byteLength(content, 'utf8')
        }
      });
    } catch (error) {
      console.error('File save error:', error);
      res.status(500).json({
        error: 'Failed to save file',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/projects/:projectId/files/:fileName
 * Get file content
 */
router.get('/:projectId/files/:fileName',
  authenticateRequest,
  validateProjectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId, fileName } = req.params;
      
      const project = vfs.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }
      
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      const content = await vfs.readFile(projectId, fileName);
      
      res.json({
        success: true,
        file: {
          name: fileName,
          content,
          size: Buffer.byteLength(content, 'utf8')
        }
      });
    } catch (error) {
      console.error('File read error:', error);
      const statusCode = error.message.includes('ENOENT') ? 404 : 500;
      res.status(statusCode).json({
        error: 'Failed to read file',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/projects/:projectId/files/:fileName
 * Delete a file from the project
 */
router.delete('/:projectId/files/:fileName',
  authenticateRequest,
  validateProjectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId, fileName } = req.params;
      
      const project = vfs.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }
      
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      await vfs.deleteFile(projectId, fileName);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/projects/:projectId/dependencies
 * Add a dependency to the project
 */
router.post('/:projectId/dependencies',
  authenticateRequest,
  projectLimiter,
  validateProjectId,
  [
    body('packageName')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Package name is required'),
    body('version')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Version must be a valid string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { packageName, version = 'latest' } = req.body;
      
      const project = vfs.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }
      
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      const dependency = await vfs.addDependency(projectId, packageName, version);
      
      res.json({
        success: true,
        message: 'Dependency added successfully',
        dependency
      });
    } catch (error) {
      console.error('Dependency addition error:', error);
      res.status(500).json({
        error: 'Failed to add dependency',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/projects/stats
 * Get project statistics
 */
router.get('/stats',
  authenticateRequest,
  (req, res) => {
    try {
      const stats = vfs.getStats();
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        error: 'Failed to get statistics',
        message: error.message
      });
    }
  }
);

module.exports = router;