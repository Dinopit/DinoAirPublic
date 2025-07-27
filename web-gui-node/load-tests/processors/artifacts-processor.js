function generateTestCode() {
  const codeTemplates = [
    'function loadTestFunction() {\n  console.log(\'Generated during load test\');\n  return { success: true, timestamp: new Date() };\n}',
    'const config = {\n  apiUrl: \'http://localhost:3000\',\n  timeout: 5000,\n  retries: 3,\n  loadTest: true\n};',
    'class LoadTestHelper {\n  constructor() {\n    this.id = Math.random().toString(36).substr(2, 9);\n  }\n  \n  execute() {\n    return \'Load test executed successfully\';\n  }\n}',
    'async function processData(input) {\n  const processed = input.map(item => ({\n    ...item,\n    processed: true,\n    timestamp: Date.now()\n  }));\n  return processed;\n}',
    'const utils = {\n  formatDate: (date) => date.toISOString(),\n  generateId: () => Math.random().toString(36),\n  validateInput: (input) => input && typeof input === \'object\'\n};'
  ];
  return codeTemplates[Math.floor(Math.random() * codeTemplates.length)];
}

function generateUpdatedTestCode() {
  return `${generateTestCode()}\n\n// Updated during load test at ${new Date().toISOString()}`;
}

function generateArtifactName() {
  const prefixes = ['LoadTest', 'Generated', 'Sample', 'Test', 'Demo'];
  const suffixes = ['Helper', 'Utils', 'Config', 'Handler', 'Service'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 10000);
  return `${prefix}${suffix}_${number}`;
}

module.exports = {
  generateTestCode,
  generateUpdatedTestCode,
  generateArtifactName
};
