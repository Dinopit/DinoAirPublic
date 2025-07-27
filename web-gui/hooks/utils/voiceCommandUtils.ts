/**
 * Voice command utility functions for fuzzy matching and command processing
 * Extracted from useVoiceCommands hook for improved maintainability and testability
 */

export interface VoiceCommand {
  phrase: string | RegExp;
  action: () => void;
  description: string;
}

export interface CommandMatchOptions {
  sensitivity: number; // 0-1, how closely the phrase must match
  prefix?: string; // Command prefix like "DinoAir" or "Hey Assistant"
}

export interface CommandMatchResult {
  command: VoiceCommand | null;
  matchedText: string;
  isMatch: boolean;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1 (1 being identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Number of single-character edits needed to transform str1 into str2
 */
export function levenshteinDistance(str1: string, str2: string): number {
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
 * Find matching command from a list of commands based on input text
 * @param commandText Input text to match against commands
 * @param commands Array of voice commands to search through
 * @param options Matching options including sensitivity threshold
 * @returns CommandMatchResult with matching command and metadata
 */
export function findMatchingCommand(
  commandText: string,
  commands: VoiceCommand[],
  options: CommandMatchOptions
): CommandMatchResult {
  const { sensitivity } = options;
  const cleanCommandText = commandText.toLowerCase().trim();

  for (const command of commands) {
    let isMatch = false;

    if (command.phrase instanceof RegExp) {
      isMatch = command.phrase.test(cleanCommandText);
    } else {
      const phrase = command.phrase.toLowerCase();
      // Simple fuzzy matching based on sensitivity
      if (sensitivity === 1) {
        isMatch = cleanCommandText === phrase;
      } else {
        // Calculate similarity using Levenshtein distance approximation
        const similarity = calculateSimilarity(cleanCommandText, phrase);
        isMatch = similarity >= sensitivity;
      }
    }

    if (isMatch) {
      return {
        command,
        matchedText: cleanCommandText,
        isMatch: true,
      };
    }
  }

  return {
    command: null,
    matchedText: cleanCommandText,
    isMatch: false,
  };
}

/**
 * Process voice command text and execute matching command if found
 * @param text Raw transcript text from speech recognition
 * @param commands Array of voice commands to match against
 * @param options Processing options including prefix and sensitivity
 * @returns Object with execution result and matched command text
 */
export function processVoiceCommand(
  text: string,
  commands: VoiceCommand[],
  options: CommandMatchOptions
): { executed: boolean; matchedText: string | null; error?: string } {
  const { prefix } = options;
  const cleanText = text.toLowerCase().trim();

  // Check for prefix if required
  if (prefix && !cleanText.startsWith(prefix.toLowerCase())) {
    return { executed: false, matchedText: null };
  }

  // Remove prefix from text for command matching
  const commandText = prefix ? cleanText.slice(prefix.length).trim() : cleanText;

  // Find matching command
  const matchResult = findMatchingCommand(commandText, commands, options);

  if (matchResult.isMatch && matchResult.command) {
    try {
      matchResult.command.action();
      return { executed: true, matchedText: matchResult.matchedText };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        executed: false,
        matchedText: matchResult.matchedText,
        error: `Error executing voice command: ${errorMessage}`,
      };
    }
  }

  return { executed: false, matchedText: commandText };
}
