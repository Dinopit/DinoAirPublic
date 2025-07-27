#!/usr/bin/env node
/**
 * Knowledge Base Demo Script
 * Demonstrates the intelligent knowledge extraction and memory system
 */

// Simple color functions for terminals that support it
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Simple implementations without external dependencies
function simpleEmbedding(text) {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  const words = normalized.split(/\s+/).filter(word => word.length > 2);
  
  const vector = new Array(384).fill(0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode * (j + 1) * (i + 1)) % 384;
      vector[index] += 1.0 / (words.length + 1);
    }
  }
  
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  
  return vector;
}

function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function extractKnowledge(text) {
  const entities = [];
  const facts = [];
  const relationships = [];
  
  // Enhanced entity extraction
  const patterns = {
    person: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
    location: /\b(?:in|at|from|to) ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    organization: /\b(?:at|for) ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    number: /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(dollars?|years?|months?|days?|hours?|percent|%)\b/gi,
    date: /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|today|yesterday|tomorrow|last\s+\w+|next\s+\w+)\b/gi
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    let match;
    pattern.lastIndex = 0; // Reset regex state
    while ((match = pattern.exec(text)) !== null) {
      const entity = {
        type,
        value: match[1] || match[0],
        confidence: 0.8,
        position: match.index
      };
      entities.push(entity);
    }
  }
  
  // Enhanced fact extraction
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) continue;
    
    const factPatterns = [
      /(.+?)\s+(is|are|was|were)\s+(.+)/i,
      /(.+?)\s+(lives?|works?|studies?)\s+(?:in|at)\s+(.+)/i,
      /(.+?)\s+(likes?|prefers?|enjoys?|loves?)\s+(.+)/i,
      /(.+?)\s+(earned?|makes?|receives?)\s+(.+)/i,
      /(.+?)\s+(has|have|had)\s+(.+)/i
    ];
    
    for (const pattern of factPatterns) {
      const match = pattern.exec(trimmed);
      if (match) {
        const fact = {
          subject: match[1].trim(),
          predicate: match[2].trim(),
          object: match[3].trim(),
          confidence: 0.7,
          source_sentence: trimmed
        };
        facts.push(fact);
        
        // Create relationship
        relationships.push({
          from: fact.subject,
          to: fact.object,
          type: fact.predicate,
          confidence: 0.7
        });
        break;
      }
    }
  }
  
  return {
    entities: entities.slice(0, 10), // Limit for demo
    facts: facts.slice(0, 5),
    relationships: relationships.slice(0, 5),
    embedding: simpleEmbedding(text),
    word_count: text.split(/\s+/).length
  };
}

function runDemo() {
  const chalk = colors; // Use our simple color functions

  console.log(chalk.blue(chalk.bold('\n🧠 DinoAir Intelligent Knowledge Base Demo\n')));
  console.log(chalk.gray('='.repeat(50)));

  // Demo 1: Knowledge Extraction
  console.log(chalk.yellow(chalk.bold('\n📚 Demo 1: Knowledge Extraction from Conversation')));
  console.log(chalk.gray('-'.repeat(40)));
  
  const conversationText = `
Alice Johnson is a software engineer at Microsoft in Seattle. She has been working there for 3 years and earns $145,000 annually. 
Alice loves machine learning and artificial intelligence. She recently completed a project on natural language processing. 
In her free time, Alice enjoys hiking and photography. She has a degree from Stanford University.
  `.trim();
  
  console.log('\n📝 Input conversation:');
  console.log(chalk.gray(conversationText));
  
  const knowledge = extractKnowledge(conversationText);
  
  console.log('\n🔍 Extracted Knowledge:');
  console.log(chalk.green(`   • ${knowledge.entities.length} entities found`));
  console.log(chalk.green(`   • ${knowledge.facts.length} facts discovered`));
  console.log(chalk.green(`   • ${knowledge.relationships.length} relationships mapped`));
  
  console.log('\n👥 Entities:');
  knowledge.entities.forEach(entity => {
    console.log(`   • ${entity.type.toUpperCase()}: ${entity.value} (${(entity.confidence * 100).toFixed(0)}% confidence)`);
  });
  
  console.log('\n📊 Facts:');
  knowledge.facts.forEach(fact => {
    console.log(`   • ${fact.subject} ${chalk.blue(fact.predicate)} ${fact.object}`);
  });
  
  console.log('\n🔗 Relationships:');
  knowledge.relationships.forEach(rel => {
    console.log(`   • ${rel.from} --[${rel.type}]--> ${rel.to}`);
  });

  // Demo 2: Semantic Search
  console.log(chalk.yellow(chalk.bold('\n🔍 Demo 2: Semantic Memory Search')));
  console.log(chalk.gray('-'.repeat(40)));
  
  const memories = [
    'Bob Smith works as a data scientist at Google in Mountain View.',
    'Sarah Chen is a product manager at Apple and lives in Cupertino.',
    'Mike Davis enjoys playing guitar and rock climbing on weekends.',
    'Lisa Wang studies computer science at MIT and loves algorithms.',
    'John Taylor is a chef at a French restaurant in New York City.'
  ];
  
  console.log('\n💾 Sample memories in knowledge base:');
  memories.forEach((memory, idx) => {
    console.log(chalk.gray(`   ${idx + 1}. ${memory}`));
  });
  
  const queries = [
    'software engineering jobs',
    'people who work at tech companies',
    'hobbies and recreational activities'
  ];
  
  console.log('\n🔍 Semantic search results:');
  
  queries.forEach(query => {
    console.log(chalk.blue(`\n   Query: "${query}"`));
    
    const queryEmbedding = simpleEmbedding(query);
    const results = memories.map(memory => ({
      memory,
      similarity: cosineSimilarity(queryEmbedding, simpleEmbedding(memory))
    }))
    .filter(result => result.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
    
    results.forEach(result => {
      const percentage = (result.similarity * 100).toFixed(1);
      console.log(`     • ${percentage}% match: ${result.memory}`);
    });
    
    if (results.length === 0) {
      console.log(chalk.gray('     No relevant memories found'));
    }
  });

  // Demo 3: Memory-Enhanced Chat
  console.log(chalk.yellow(chalk.bold('\n💬 Demo 3: Memory-Enhanced Chat Response')));
  console.log(chalk.gray('-'.repeat(40)));
  
  const userMessage = 'Tell me about software engineers in our conversation';
  const relevantMemories = memories.filter(memory => 
    memory.includes('engineer') || memory.includes('scientist') || memory.includes('computer')
  );
  
  console.log(chalk.blue(`\n👤 User: ${userMessage}`));
  
  console.log('\n🧠 AI Memory Context:');
  relevantMemories.forEach(memory => {
    console.log(chalk.gray(`   • ${memory}`));
  });
  
  const aiResponse = `Based on our previous conversations, I remember discussing several people in tech:
  
• Alice Johnson - software engineer at Microsoft in Seattle, earns $145,000, loves ML/AI
• Bob Smith - data scientist at Google in Mountain View  
• Lisa Wang - computer science student at MIT who loves algorithms

These individuals represent different aspects of the software engineering field, from industry professionals to students. Would you like me to elaborate on any specific person or aspect?`;

  console.log(chalk.green('\n🤖 AI Response (Enhanced with Memory):'));
  console.log(aiResponse);

  // Demo 4: Privacy Controls
  console.log(chalk.yellow(chalk.bold('\n🔒 Demo 4: Privacy & Memory Management')));
  console.log(chalk.gray('-'.repeat(40)));
  
  const privacyFeatures = [
    '✅ Memory can be enabled/disabled per user',
    '✅ Automatic knowledge extraction can be toggled',
    '✅ Retention periods can be set (e.g., 30 days, 1 year, indefinite)',
    '✅ Users can delete all memories instantly',
    '✅ Anonymized data sharing is opt-in only',
    '✅ Memories are isolated per user (no cross-contamination)',
    '✅ All data stays local to your DinoAir instance'
  ];
  
  console.log('\n🛡️  Privacy Features:');
  privacyFeatures.forEach(feature => {
    console.log(`   ${feature}`);
  });

  // Summary
  console.log(chalk.yellow(chalk.bold('\n📋 Summary')));
  console.log(chalk.gray('-'.repeat(40)));
  
  console.log('\n🎯 The Intelligent Knowledge Base provides:');
  console.log('   • Automatic knowledge extraction from conversations');
  console.log('   • Semantic memory search with vector embeddings');
  console.log('   • Cross-session context awareness for AI responses');
  console.log('   • Complete privacy control over memory retention');
  console.log('   • Entity and relationship mapping');
  console.log('   • Fact verification and cross-referencing capabilities');
  
  console.log(chalk.green(chalk.bold('\n✨ Knowledge Base System is ready for DinoAir integration!')));
  console.log(chalk.blue('\n🚀 Next steps:'));
  console.log('   1. Run database migration: npm run db:setup-kb');
  console.log('   2. Start DinoAir server with knowledge base enabled');
  console.log('   3. Chat with AI and watch it learn and remember!');
  
  console.log(chalk.gray('\n' + '='.repeat(50) + '\n'));
}

if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };