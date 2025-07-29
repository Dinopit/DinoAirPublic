/**
 * DinoAir Search Indexer Worker
 * Handles parallel artifact search indexing and full-text search operations
 */

class SearchIndexer {
  constructor() {
    this.index = new Map();
    this.invertedIndex = new Map();
    this.artifacts = new Map();
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
      'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their',
      'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some',
      'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two', 'more',
      'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call',
      'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get',
      'come', 'made', 'may', 'part'
    ]);

    console.log('[Search Worker] Initialized');
  }

  /**
   * Process incoming messages from main thread
   */
  handleMessage(event) {
    const { type, id, data } = event.data;

    console.log(`[Search Worker] Received message: ${type}`);

    switch (type) {
      case 'INDEX_ARTIFACT':
        this.indexArtifact(id, data);
        break;
      case 'INDEX_BATCH':
        this.indexBatch(id, data);
        break;
      case 'SEARCH':
        this.search(id, data);
        break;
      case 'ADVANCED_SEARCH':
        this.advancedSearch(id, data);
        break;
      case 'FUZZY_SEARCH':
        this.fuzzySearch(id, data);
        break;
      case 'REMOVE_FROM_INDEX':
        this.removeFromIndex(id, data);
        break;
      case 'UPDATE_INDEX':
        this.updateIndex(id, data);
        break;
      case 'GET_SUGGESTIONS':
        this.getSuggestions(id, data);
        break;
      case 'GET_INDEX_STATS':
        this.getIndexStats(id, data);
        break;
      case 'CLEAR_INDEX':
        this.clearIndex(id, data);
        break;
      case 'EXPORT_INDEX':
        this.exportIndex(id, data);
        break;
      case 'IMPORT_INDEX':
        this.importIndex(id, data);
        break;
      default:
        this.sendError(id, `Unknown message type: ${type}`);
    }
  }

  /**
   * Index a single artifact
   */
  async indexArtifact(id, data) {
    try {
      const { artifact } = data;

      this.sendProgress(id, 'Indexing artifact...', 10);

      // Store artifact
      this.artifacts.set(artifact.id, artifact);

      this.sendProgress(id, 'Tokenizing content...', 30);

      // Tokenize content
      const tokens = this.tokenize(artifact.content);

      this.sendProgress(id, 'Building index...', 60);

      // Build index for this artifact
      const artifactIndex = {
        id: artifact.id,
        title: artifact.title || '',
        type: artifact.type || 'unknown',
        language: artifact.language || '',
        tags: artifact.tags || [],
        tokens,
        wordCount: tokens.length,
        uniqueWords: [...new Set(tokens)].length,
        createdAt: artifact.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in main index
      this.index.set(artifact.id, artifactIndex);

      this.sendProgress(id, 'Updating inverted index...', 80);

      // Update inverted index
      this.updateInvertedIndex(artifact.id, tokens);

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        artifactId: artifact.id,
        tokensIndexed: tokens.length,
        uniqueTokens: [...new Set(tokens)].length
      });
    } catch (error) {
      console.error('[Search Worker] Indexing error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Index multiple artifacts in batch
   */
  async indexBatch(id, data) {
    try {
      const { artifacts } = data;
      let processed = 0;
      const results = [];

      this.sendProgress(id, 'Starting batch indexing...', 5);

      for (const artifact of artifacts) {
        try {
          // Store artifact
          this.artifacts.set(artifact.id, artifact);

          // Tokenize content
          const tokens = this.tokenize(artifact.content);

          // Build index for this artifact
          const artifactIndex = {
            id: artifact.id,
            title: artifact.title || '',
            type: artifact.type || 'unknown',
            language: artifact.language || '',
            tags: artifact.tags || [],
            tokens,
            wordCount: tokens.length,
            uniqueWords: [...new Set(tokens)].length,
            createdAt: artifact.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Store in main index
          this.index.set(artifact.id, artifactIndex);

          // Update inverted index
          this.updateInvertedIndex(artifact.id, tokens);

          results.push({
            artifactId: artifact.id,
            tokensIndexed: tokens.length,
            uniqueTokens: [...new Set(tokens)].length
          });

          processed++;
          const progress = Math.round((processed / artifacts.length) * 90) + 5;
          this.sendProgress(id, `Indexed ${processed}/${artifacts.length} artifacts...`, progress);
        } catch (error) {
          console.error(`[Search Worker] Error indexing artifact ${artifact.id}:`, error);
          results.push({
            artifactId: artifact.id,
            error: error.message
          });
        }
      }

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        totalProcessed: processed,
        results,
        indexSize: this.index.size,
        invertedIndexSize: this.invertedIndex.size
      });
    } catch (error) {
      console.error('[Search Worker] Batch indexing error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Perform basic search
   */
  async search(id, data) {
    try {
      const { query, options = {} } = data;

      this.sendProgress(id, 'Processing search query...', 20);

      const {
        limit = 50,
        offset = 0,
        type = null,
        language = null,
        tags = [],
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = options;

      // Tokenize query
      const queryTokens = this.tokenize(query);

      this.sendProgress(id, 'Searching index...', 50);

      // Find matching artifacts
      const matches = [];

      for (const token of queryTokens) {
        if (this.invertedIndex.has(token)) {
          const artifactIds = this.invertedIndex.get(token);

          for (const artifactId of artifactIds) {
            const artifactIndex = this.index.get(artifactId);
            if (!artifactIndex) { continue; }

            // Apply filters
            if (type && artifactIndex.type !== type) { continue; }
            if (language && artifactIndex.language !== language) { continue; }
            if (tags.length > 0 && !tags.some(tag => artifactIndex.tags.includes(tag))) { continue; }

            // Calculate relevance score
            const score = this.calculateRelevanceScore(queryTokens, artifactIndex);

            const existingMatch = matches.find(m => m.artifactId === artifactId);
            if (existingMatch) {
              existingMatch.score += score;
              existingMatch.matchingTokens = [...new Set([...existingMatch.matchingTokens, token])];
            } else {
              matches.push({
                artifactId,
                score,
                matchingTokens: [token],
                artifact: this.artifacts.get(artifactId)
              });
            }
          }
        }
      }

      this.sendProgress(id, 'Ranking results...', 80);

      // Sort results
      matches.sort((a, b) => {
        if (sortBy === 'relevance') {
          return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
        } else if (sortBy === 'date') {
          const dateA = new Date(a.artifact.createdAt || 0);
          const dateB = new Date(b.artifact.createdAt || 0);
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        } else if (sortBy === 'title') {
          const titleA = (a.artifact.title || '').toLowerCase();
          const titleB = (b.artifact.title || '').toLowerCase();
          return sortOrder === 'desc' ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB);
        }
        return 0;
      });

      // Apply pagination
      const paginatedResults = matches.slice(offset, offset + limit);

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        query,
        results: paginatedResults,
        totalResults: matches.length,
        hasMore: offset + limit < matches.length,
        searchTime: Date.now(),
        suggestions: this.generateSearchSuggestions(query, queryTokens)
      });
    } catch (error) {
      console.error('[Search Worker] Search error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Perform advanced search with complex queries
   */
  async advancedSearch(id, data) {
    try {
      const { query, options = {} } = data;

      this.sendProgress(id, 'Parsing advanced query...', 10);

      // Parse advanced query syntax
      const parsedQuery = this.parseAdvancedQuery(query);

      this.sendProgress(id, 'Executing search...', 30);

      const matches = [];

      // Execute different query types
      for (const clause of parsedQuery.clauses) {
        const clauseMatches = await this.executeQueryClause(clause, options);

        if (parsedQuery.operator === 'AND') {
          // Intersection of results
          if (matches.length === 0) {
            matches.push(...clauseMatches);
          } else {
            const intersectionIds = new Set(clauseMatches.map(m => m.artifactId));
            matches.splice(0, matches.length, ...matches.filter(m => intersectionIds.has(m.artifactId)));
          }
        } else if (parsedQuery.operator === 'OR') {
          // Union of results
          for (const match of clauseMatches) {
            const existing = matches.find(m => m.artifactId === match.artifactId);
            if (existing) {
              existing.score += match.score;
              existing.matchingTokens = [...new Set([...existing.matchingTokens, ...match.matchingTokens])];
            } else {
              matches.push(match);
            }
          }
        }
      }

      this.sendProgress(id, 'Ranking results...', 80);

      // Sort by relevance
      matches.sort((a, b) => b.score - a.score);

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        query,
        parsedQuery,
        results: matches.slice(0, options.limit || 50),
        totalResults: matches.length
      });
    } catch (error) {
      console.error('[Search Worker] Advanced search error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Perform fuzzy search for typo tolerance
   */
  async fuzzySearch(id, data) {
    try {
      const { query, options = {} } = data;
      const { maxDistance = 2, minSimilarity = 0.6 } = options;

      this.sendProgress(id, 'Performing fuzzy search...', 20);

      const queryTokens = this.tokenize(query);
      const matches = [];

      // Get all unique tokens from index
      const allTokens = [...this.invertedIndex.keys()];

      this.sendProgress(id, 'Finding similar terms...', 50);

      for (const queryToken of queryTokens) {
        // Find similar tokens using edit distance
        const similarTokens = allTokens.filter(token => {
          const distance = this.calculateEditDistance(queryToken, token);
          const similarity = 1 - (distance / Math.max(queryToken.length, token.length));
          return distance <= maxDistance && similarity >= minSimilarity;
        });

        // Search for artifacts containing similar tokens
        for (const similarToken of similarTokens) {
          const artifactIds = this.invertedIndex.get(similarToken);

          for (const artifactId of artifactIds) {
            const artifactIndex = this.index.get(artifactId);
            if (!artifactIndex) { continue; }

            const similarity = 1 - (this.calculateEditDistance(queryToken, similarToken) / Math.max(queryToken.length, similarToken.length));
            const score = similarity * this.calculateRelevanceScore([similarToken], artifactIndex);

            const existingMatch = matches.find(m => m.artifactId === artifactId);
            if (existingMatch) {
              existingMatch.score += score;
              existingMatch.matchingTokens = [...new Set([...existingMatch.matchingTokens, similarToken])];
              existingMatch.fuzzyMatches = [...new Set([...existingMatch.fuzzyMatches, { original: queryToken, matched: similarToken, similarity }])];
            } else {
              matches.push({
                artifactId,
                score,
                matchingTokens: [similarToken],
                fuzzyMatches: [{ original: queryToken, matched: similarToken, similarity }],
                artifact: this.artifacts.get(artifactId)
              });
            }
          }
        }
      }

      this.sendProgress(id, 'Ranking results...', 80);

      // Sort by score
      matches.sort((a, b) => b.score - a.score);

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        query,
        results: matches.slice(0, options.limit || 50),
        totalResults: matches.length,
        fuzzySearch: true
      });
    } catch (error) {
      console.error('[Search Worker] Fuzzy search error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Remove artifact from index
   */
  async removeFromIndex(id, data) {
    try {
      const { artifactId } = data;

      // Remove from main index
      const artifactIndex = this.index.get(artifactId);
      if (artifactIndex) {
        // Remove from inverted index
        for (const token of artifactIndex.tokens) {
          if (this.invertedIndex.has(token)) {
            const artifactIds = this.invertedIndex.get(token);
            artifactIds.delete(artifactId);

            // Remove token if no artifacts contain it
            if (artifactIds.size === 0) {
              this.invertedIndex.delete(token);
            }
          }
        }

        this.index.delete(artifactId);
      }

      // Remove artifact
      this.artifacts.delete(artifactId);

      this.sendSuccess(id, {
        artifactId,
        removed: true,
        indexSize: this.index.size
      });
    } catch (error) {
      console.error('[Search Worker] Remove error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Update existing artifact in index
   */
  async updateIndex(id, data) {
    try {
      const { artifact } = data;

      // Remove old version
      await this.removeFromIndex(id, { artifactId: artifact.id });

      // Add new version
      await this.indexArtifact(id, { artifact });
    } catch (error) {
      console.error('[Search Worker] Update error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(id, data) {
    try {
      const { query, limit = 10 } = data;

      const queryTokens = this.tokenize(query);
      const suggestions = [];

      // Get all tokens from index
      const allTokens = [...this.invertedIndex.keys()];

      for (const queryToken of queryTokens) {
        // Find tokens that start with query token
        const prefixMatches = allTokens
          .filter(token => token.startsWith(queryToken) && token !== queryToken)
          .slice(0, limit);

        suggestions.push(...prefixMatches);
      }

      // Remove duplicates and sort by frequency
      const uniqueSuggestions = [...new Set(suggestions)]
        .map(token => ({
          term: token,
          frequency: this.invertedIndex.get(token).size
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit);

      this.sendSuccess(id, {
        query,
        suggestions: uniqueSuggestions
      });
    } catch (error) {
      console.error('[Search Worker] Suggestions error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(id, data) {
    try {
      const stats = {
        totalArtifacts: this.index.size,
        totalTokens: this.invertedIndex.size,
        averageTokensPerArtifact: 0,
        typeDistribution: {},
        languageDistribution: {},
        indexSize: this.calculateIndexSize(),
        mostCommonTokens: this.getMostCommonTokens(10),
        recentlyIndexed: this.getRecentlyIndexed(5)
      };

      // Calculate averages and distributions
      let totalTokenCount = 0;

      for (const artifactIndex of this.index.values()) {
        totalTokenCount += artifactIndex.wordCount;

        // Type distribution
        stats.typeDistribution[artifactIndex.type] = (stats.typeDistribution[artifactIndex.type] || 0) + 1;

        // Language distribution
        if (artifactIndex.language) {
          stats.languageDistribution[artifactIndex.language] = (stats.languageDistribution[artifactIndex.language] || 0) + 1;
        }
      }

      stats.averageTokensPerArtifact = this.index.size > 0 ? Math.round(totalTokenCount / this.index.size) : 0;

      this.sendSuccess(id, stats);
    } catch (error) {
      console.error('[Search Worker] Stats error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Clear entire index
   */
  async clearIndex(id, data) {
    try {
      this.index.clear();
      this.invertedIndex.clear();
      this.artifacts.clear();

      this.sendSuccess(id, {
        cleared: true,
        indexSize: 0
      });
    } catch (error) {
      console.error('[Search Worker] Clear error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Export index data
   */
  async exportIndex(id, data) {
    try {
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        index: Object.fromEntries(this.index),
        invertedIndex: Object.fromEntries(
          Array.from(this.invertedIndex.entries()).map(([key, value]) => [key, Array.from(value)])
        ),
        artifacts: Object.fromEntries(this.artifacts)
      };

      this.sendSuccess(id, {
        data: exportData,
        size: JSON.stringify(exportData).length
      });
    } catch (error) {
      console.error('[Search Worker] Export error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Import index data
   */
  async importIndex(id, data) {
    try {
      const { indexData } = data;

      // Clear existing index
      this.index.clear();
      this.invertedIndex.clear();
      this.artifacts.clear();

      // Import data
      this.index = new Map(Object.entries(indexData.index));
      this.invertedIndex = new Map(
        Object.entries(indexData.invertedIndex).map(([key, value]) => [key, new Set(value)])
      );
      this.artifacts = new Map(Object.entries(indexData.artifacts));

      this.sendSuccess(id, {
        imported: true,
        indexSize: this.index.size,
        version: indexData.version
      });
    } catch (error) {
      console.error('[Search Worker] Import error:', error);
      this.sendError(id, error.message);
    }
  }

  // Utility methods

  /**
   * Tokenize text content
   */
  tokenize(content) {
    if (!content || typeof content !== 'string') { return []; }

    // Convert to lowercase and extract words
    const tokens = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.stopWords.has(token));

    return tokens;
  }

  /**
   * Update inverted index with tokens
   */
  updateInvertedIndex(artifactId, tokens) {
    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token).add(artifactId);
    }
  }

  /**
   * Calculate relevance score
   */
  calculateRelevanceScore(queryTokens, artifactIndex) {
    let score = 0;
    const artifactTokens = artifactIndex.tokens;

    for (const queryToken of queryTokens) {
      // Term frequency in artifact
      const tf = artifactTokens.filter(token => token === queryToken).length / artifactTokens.length;

      // Inverse document frequency
      const documentsWithTerm = this.invertedIndex.get(queryToken)?.size || 1;
      const idf = Math.log(this.index.size / documentsWithTerm);

      // TF-IDF score
      score += tf * idf;

      // Boost score for title matches
      if (artifactIndex.title.toLowerCase().includes(queryToken)) {
        score += 2;
      }

      // Boost score for tag matches
      if (artifactIndex.tags.some(tag => tag.toLowerCase().includes(queryToken))) {
        score += 1.5;
      }
    }

    return score;
  }

  /**
   * Parse advanced query syntax
   */
  parseAdvancedQuery(query) {
    const parsed = {
      clauses: [],
      operator: 'AND'
    };

    // Simple parsing for demonstration
    // In a real implementation, you'd use a proper query parser

    if (query.includes(' OR ')) {
      parsed.operator = 'OR';
      parsed.clauses = query.split(' OR ').map(clause => ({
        type: 'term',
        value: clause.trim(),
        field: 'content'
      }));
    } else if (query.includes(' AND ')) {
      parsed.operator = 'AND';
      parsed.clauses = query.split(' AND ').map(clause => ({
        type: 'term',
        value: clause.trim(),
        field: 'content'
      }));
    } else {
      // Check for field-specific queries
      const fieldMatch = query.match(/(\w+):(.+)/);
      if (fieldMatch) {
        parsed.clauses.push({
          type: 'field',
          field: fieldMatch[1],
          value: fieldMatch[2].trim()
        });
      } else {
        parsed.clauses.push({
          type: 'term',
          value: query,
          field: 'content'
        });
      }
    }

    return parsed;
  }

  /**
   * Execute a single query clause
   */
  async executeQueryClause(clause, options) {
    const matches = [];

    if (clause.type === 'term') {
      const tokens = this.tokenize(clause.value);

      for (const token of tokens) {
        if (this.invertedIndex.has(token)) {
          const artifactIds = this.invertedIndex.get(token);

          for (const artifactId of artifactIds) {
            const artifactIndex = this.index.get(artifactId);
            if (!artifactIndex) { continue; }

            const score = this.calculateRelevanceScore([token], artifactIndex);

            const existingMatch = matches.find(m => m.artifactId === artifactId);
            if (existingMatch) {
              existingMatch.score += score;
              existingMatch.matchingTokens.push(token);
            } else {
              matches.push({
                artifactId,
                score,
                matchingTokens: [token],
                artifact: this.artifacts.get(artifactId)
              });
            }
          }
        }
      }
    } else if (clause.type === 'field') {
      // Field-specific search
      for (const [artifactId, artifactIndex] of this.index.entries()) {
        let fieldValue = '';

        switch (clause.field) {
          case 'title':
            fieldValue = artifactIndex.title;
            break;
          case 'type':
            fieldValue = artifactIndex.type;
            break;
          case 'language':
            fieldValue = artifactIndex.language;
            break;
          case 'tags':
            fieldValue = artifactIndex.tags.join(' ');
            break;
          default:
            continue;
        }

        if (fieldValue.toLowerCase().includes(clause.value.toLowerCase())) {
          matches.push({
            artifactId,
            score: 1,
            matchingTokens: [clause.value],
            artifact: this.artifacts.get(artifactId)
          });
        }
      }
    }

    return matches;
  }

  /**
   * Calculate edit distance between two strings
   */
  calculateEditDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate search suggestions
   */
  generateSearchSuggestions(query, queryTokens) {
    const suggestions = [];

    // Get related terms from index
    const relatedTerms = new Set();

    for (const token of queryTokens) {
      if (this.invertedIndex.has(token)) {
        const artifactIds = this.invertedIndex.get(token);

        // Get other tokens from same artifacts
        for (const artifactId of artifactIds) {
          const artifactIndex = this.index.get(artifactId);
          if (artifactIndex) {
            artifactIndex.tokens.forEach(t => {
              if (t !== token && t.length > 3) {
                relatedTerms.add(t);
              }
            });
          }
        }
      }
    }

    // Convert to array and sort by frequency
    const sortedTerms = Array.from(relatedTerms)
      .map(term => ({
        term,
        frequency: this.invertedIndex.get(term)?.size || 0
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    return sortedTerms;
  }

  /**
   * Calculate index size in bytes (approximate)
   */
  calculateIndexSize() {
    let size = 0;

    // Estimate size of main index
    for (const artifactIndex of this.index.values()) {
      size += JSON.stringify(artifactIndex).length;
    }

    // Estimate size of inverted index
    for (const [token, artifactIds] of this.invertedIndex.entries()) {
      size += token.length + (artifactIds.size * 36); // Approximate UUID size
    }

    return size;
  }

  /**
   * Get most common tokens
   */
  getMostCommonTokens(limit) {
    return Array.from(this.invertedIndex.entries())
      .map(([token, artifactIds]) => ({
        token,
        frequency: artifactIds.size
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get recently indexed artifacts
   */
  getRecentlyIndexed(limit) {
    return Array.from(this.index.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limit)
      .map(artifactIndex => ({
        id: artifactIndex.id,
        title: artifactIndex.title,
        type: artifactIndex.type,
        updatedAt: artifactIndex.updatedAt
      }));
  }

  // Communication methods
  sendProgress(id, message, progress) {
    self.postMessage({
      type: 'PROGRESS',
      id,
      data: { message, progress }
    });
  }

  sendSuccess(id, result) {
    self.postMessage({
      type: 'SUCCESS',
      id,
      data: result
    });
  }

  sendError(id, error) {
    self.postMessage({
      type: 'ERROR',
      id,
      data: { error }
    });
  }
}

// Initialize worker
const indexer = new SearchIndexer();

// Listen for messages from main thread
self.addEventListener('message', event => {
  indexer.handleMessage(event);
});

console.log('[Search Worker] Worker script loaded and ready');
