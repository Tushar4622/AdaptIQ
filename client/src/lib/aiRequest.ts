type AiRequestError = {
  response?: {
    status?: number;
    headers?: Record<string, string | undefined>;
    data?: { error?: string };
  };
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getRetryDelay = (error: AiRequestError, attempt: number) => {
  const retryAfter = error.response?.headers?.['retry-after'];
  const seconds = Number(retryAfter);
  if (retryAfter && Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const retryDate = retryAfter ? Date.parse(retryAfter) : NaN;
  if (!Number.isNaN(retryDate)) return Math.max(0, retryDate - Date.now());

  return 1000 * (2 ** attempt) + Math.floor(Math.random() * 250);
};

export const retryAiRequest = async <T>(
  request: () => Promise<T>,
  onRetry: () => void
): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const requestError = error as AiRequestError;
      const status = Number(requestError.response?.status);
      const retryableServiceUnavailable = status === 503
        && /AI is busy|temporarily unavailable/i.test(requestError.response?.data?.error || '');
      if ((status !== 429 && !retryableServiceUnavailable) || attempt >= 2) throw error;

      onRetry();
      await sleep(getRetryDelay(requestError, attempt));
    }
  }
};