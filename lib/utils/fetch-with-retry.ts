/**
 * Custom fetch wrapper with automatic retry, exponential backoff,
 * rate limit (429) throttling, and timeout controls.
 */
export interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    backoffMs = 500,
    timeoutMs = 8000,
    ...fetchOptions
  } = options;

  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        if (attempt >= retries) {
          console.warn(`[fetchWithRetry] Rate limited (429) on final attempt ${attempt} for ${url}`);
          return response;
        }

        const retryAfterHeader = response.headers.get('Retry-After');
        let delay = backoffMs * Math.pow(2, attempt);
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds)) {
            delay = parsedSeconds * 1000;
          }
        }

        console.warn(`[fetchWithRetry] Rate limited (429) on ${url}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (response.status >= 500 && attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.warn(`[fetchWithRetry] Server error (${response.status}) on ${url}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);

      const isTimeout = err instanceof Error && err.name === 'AbortError';

      if (attempt >= retries) {
        console.error(`[fetchWithRetry] Failed all ${retries} attempts for ${url}. Last error:`, err);
        throw err;
      }

      const delay = backoffMs * Math.pow(2, attempt);
      console.warn(
        `[fetchWithRetry] Attempt ${attempt} failed for ${url} due to ${
          isTimeout ? 'Timeout' : err instanceof Error ? err.message : String(err)
        }. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
