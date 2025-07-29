/**
 * Code Execution API Routes
 * RESTful API for secure code execution and management
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { CodeExecutionService } = require('../../lib/code-execution-service');
// Mock authentication middleware for simple testing
const authenticateRequest = (req, res, next) => {
  // In a real implementation, this would validate JWT tokens, API keys, etc.
  req.user = req.user || { id: 'anonymous', name: 'Anonymous User' };
  next();
};
const rateLimit = require('express-rate-limit');

// Initialize code execution service
const codeExecutionService = new CodeExecutionService();

// Rate limiting for code execution
const codeExecutionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 executions per minute per IP
  message: {
    error: 'Too many code execution requests',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateCodeExecution = [
  body('language')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Language is required and must be a valid string'),
  body('code')
    .isString()
    .isLength({ min: 1, max: 100000 })
    .withMessage('Code is required and must not exceed 100KB'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.timeout')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('Timeout must be between 1 and 60 seconds'),
  body('options.projectId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project ID must be a valid string')
];

const validateExecutionId = [
  param('executionId')
    .isUUID()
    .withMessage('Execution ID must be a valid UUID')
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
 * POST /api/code-execution/execute
 * Execute code in a secure sandbox
 */
router.post('/execute',
  authenticateRequest,
  codeExecutionLimiter,
  validateCodeExecution,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { language, code, options = {} } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      // Add user context to options
      options.userId = userId;
      options.timestamp = new Date().toISOString();
      
      const execution = await codeExecutionService.executeCode({
        language,
        code,
        options
      });
      
      res.json({
        success: true,
        execution: {
          id: execution.id,
          language: execution.language,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          duration: execution.duration,
          output: execution.output,
          error: execution.error
        }
      });
    } catch (error) {
      console.error('Code execution error:', error);
      res.status(500).json({
        error: 'Code execution failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/code-execution/status/:executionId
 * Get execution status and results
 */
router.get('/status/:executionId',
  authenticateRequest,
  validateExecutionId,
  handleValidationErrors,
  (req, res) => {
    try {
      const { executionId } = req.params;
      const execution = codeExecutionService.getExecutionStatus(executionId);
      
      if (!execution) {
        return res.status(404).json({
          error: 'Execution not found'
        });
      }
      
      res.json({
        success: true,
        execution: {
          id: execution.id,
          language: execution.language,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          duration: execution.duration,
          output: execution.output,
          error: execution.error
        }
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        error: 'Failed to get execution status',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/code-execution/cancel/:executionId
 * Cancel a running execution
 */
router.delete('/cancel/:executionId',
  authenticateRequest,
  validateExecutionId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { executionId } = req.params;
      const execution = await codeExecutionService.cancelExecution(executionId);
      
      res.json({
        success: true,
        message: 'Execution cancelled',
        execution: {
          id: execution.id,
          status: execution.status,
          duration: execution.duration
        }
      });
    } catch (error) {
      console.error('Cancellation error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: 'Failed to cancel execution',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/code-execution/languages
 * Get list of supported programming languages
 */
router.get('/languages', (req, res) => {
  try {
    const languages = codeExecutionService.getSupportedLanguages();
    res.json({
      success: true,
      languages
    });
  } catch (error) {
    console.error('Languages list error:', error);
    res.status(500).json({
      error: 'Failed to get supported languages',
      message: error.message
    });
  }
});

/**
 * GET /api/code-execution/health
 * Health check for code execution service
 */
router.get('/health', async (req, res) => {
  try {
    const health = await codeExecutionService.healthCheck();
    const stats = codeExecutionService.getStats();
    
    res.json({
      success: true,
      health,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/code-execution/stats
 * Get execution statistics
 */
router.get('/stats',
  authenticateRequest,
  (req, res) => {
    try {
      const stats = codeExecutionService.getStats();
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
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

/**
 * POST /api/code-execution/examples
 * Get example code for different languages
 */
router.get('/examples/:language?', (req, res) => {
  const { language } = req.params;
  
  const examples = {
    python: {
      helloWorld: 'print("Hello, World!")',
      fibonacci: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`,
      dataStructures: `# Working with lists and dictionaries
numbers = [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]
print("Original:", numbers)
print("Squared:", squared)

person = {"name": "Alice", "age": 30, "city": "New York"}
print(f"Person: {person['name']}, Age: {person['age']}")`
    },
    javascript: {
      helloWorld: 'console.log("Hello, World!");',
      fibonacci: `function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

for (let i = 0; i < 10; i++) {
    console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
      asyncExample: `async function fetchData() {
    return new Promise(resolve => {
        setTimeout(() => resolve("Data fetched!"), 1000);
    });
}

(async () => {
    console.log("Fetching data...");
    const result = await fetchData();
    console.log(result);
})();`
    },
    java: {
      helloWorld: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
      fibonacci: `public class Main {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n-1) + fibonacci(n-2);
    }
    
    public static void main(String[] args) {
        for (int i = 0; i < 10; i++) {
            System.out.println("F(" + i + ") = " + fibonacci(i));
        }
    }
}`
    },
    cpp: {
      helloWorld: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
      fibonacci: `#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

int main() {
    for (int i = 0; i < 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }
    return 0;
}`
    },
    go: {
      helloWorld: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
      fibonacci: `package main

import "fmt"

func fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return fibonacci(n-1) + fibonacci(n-2)
}

func main() {
    for i := 0; i < 10; i++ {
        fmt.Printf("F(%d) = %d\\n", i, fibonacci(i))
    }
}`
    },
    rust: {
      helloWorld: `fn main() {
    println!("Hello, World!");
}`,
      fibonacci: `fn fibonacci(n: u32) -> u32 {
    if n <= 1 {
        n
    } else {
        fibonacci(n - 1) + fibonacci(n - 2)
    }
}

fn main() {
    for i in 0..10 {
        println!("F({}) = {}", i, fibonacci(i));
    }
}`
    }
  };
  
  if (language) {
    if (examples[language]) {
      res.json({
        success: true,
        language,
        examples: examples[language]
      });
    } else {
      res.status(404).json({
        error: 'Language not found',
        supportedLanguages: Object.keys(examples)
      });
    }
  } else {
    res.json({
      success: true,
      examples
    });
  }
});

// WebSocket events setup (if needed)
codeExecutionService.on('executionStarted', (execution) => {
  // Emit to connected WebSocket clients
  console.log(`Execution started: ${execution.id}`);
});

codeExecutionService.on('executionCompleted', (execution) => {
  console.log(`Execution completed: ${execution.id} in ${execution.duration}ms`);
});

codeExecutionService.on('executionError', (data) => {
  console.error(`Execution error: ${data.executionId} - ${data.error}`);
});

module.exports = router;