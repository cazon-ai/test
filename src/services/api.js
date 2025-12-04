// FIX: Error: API rate limit exceeded
// Suggested by Cazon AI at line 67
// Implement exponential backoff retry logic:

const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('rate limit') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
};

Also consider implementing request caching to reduce API calls.

// Original code with error
// TODO: Replace with actual file content