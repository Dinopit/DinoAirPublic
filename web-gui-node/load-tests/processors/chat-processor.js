function generateRandomQuestion() {
  const questions = [
    'What is the weather like today?',
    'Can you help me write a JavaScript function?',
    'Explain quantum computing in simple terms',
    'What are the benefits of renewable energy?',
    'How do I improve my coding skills?',
    'What is machine learning?',
    'Can you write a Python script for data analysis?',
    'Explain the concept of blockchain',
    'What are best practices for web development?',
    'How does artificial intelligence work?',
    'What is the difference between React and Vue?',
    'How do I optimize database queries?',
    'Explain REST API design principles',
    'What are microservices?',
    'How does Docker work?'
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateSystemPrompt() {
  const prompts = [
    'You are a helpful AI assistant.',
    'You are a coding expert who provides clear explanations.',
    'You are a technical consultant specializing in web development.',
    'You are an AI tutor who explains complex topics simply.',
    'You are a software architect with deep technical knowledge.'
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

module.exports = {
  generateRandomQuestion,
  generateSystemPrompt
};
