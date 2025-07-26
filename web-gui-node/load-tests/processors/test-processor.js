const { faker } = require('@faker-js/faker');

function generateRandomQuestion() {
  const questions = [
    "What is the weather like today?",
    "Can you help me write a JavaScript function?",
    "Explain quantum computing in simple terms",
    "What are the benefits of renewable energy?",
    "How do I improve my coding skills?",
    "What is machine learning?",
    "Can you write a Python script for data analysis?",
    "Explain the concept of blockchain",
    "What are best practices for web development?",
    "How does artificial intelligence work?"
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateTestCode() {
  const codeTemplates = [
    `function hello() {\n  console.log('Hello from load test!');\n  return 'success';\n}`,
    `const data = {\n  id: ${Math.floor(Math.random() * 1000)},\n  name: 'Load Test Item',\n  timestamp: new Date().toISOString()\n};`,
    `class TestClass {\n  constructor(name) {\n    this.name = name;\n  }\n  \n  greet() {\n    return \`Hello, \${this.name}!\`;\n  }\n}`,
    `async function fetchData() {\n  try {\n    const response = await fetch('/api/data');\n    return await response.json();\n  } catch (error) {\n    console.error('Error:', error);\n  }\n}`
  ];
  return codeTemplates[Math.floor(Math.random() * codeTemplates.length)];
}

function generateUpdatedTestCode() {
  return generateTestCode() + '\n\n// Updated during load test';
}

module.exports = {
  generateRandomQuestion,
  generateTestCode,
  generateUpdatedTestCode
};
