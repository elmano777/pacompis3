/**
 * Improved tokenizer for handling input strings.
 * Supports both space-separated and concatenated tokens.
 */

export interface TokenizeOptions {
  /**
   * If true and no spaces found, attempt character-by-character splitting.
   * Useful for inputs like "aab" -> ["a", "a", "b"]
   */
  autoSplit?: boolean
}

export function tokenize(input: string, options: TokenizeOptions = {}): string[] {
  if (!input || input.trim().length === 0) {
    return []
  }

  const trimmed = input.trim()
  
  // Try space-separated first
  const spaceSplit = trimmed.split(/\s+/).filter(t => t.length > 0)
  
  // If we got multiple tokens from space-split, use it
  if (spaceSplit.length > 1) {
    return spaceSplit
  }

  // Single token or no spaces found
  if (spaceSplit.length === 1) {
    const token = spaceSplit[0]
    
    // If autoSplit is enabled and token looks like concatenated chars, split it
    if (options.autoSplit && token.length > 1) {
      // Check if it looks like concatenated single characters (e.g., "aab", "abc")
      // This is a heuristic: if all characters are single letters/digits, split
      const allSimple = /^[a-zA-Z0-9\+\-\*\/\(\)\$\.,;:\[\]\{\}ε]+$/.test(token)
      if (allSimple) {
        return token.split('')
      }
    }
    
    return [token]
  }

  return []
}

/**
 * Add end-of-input marker
 */
export function addEndMarker(tokens: string[]): string[] {
  return [...tokens, '$']
}
