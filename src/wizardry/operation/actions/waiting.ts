// waiting.ts - Allows the AI to pause execution for a specified duration, but only when necessary

export async function waiting (payload: { seconds: number }): Promise<void> {
  const { seconds } = payload;

  if (typeof seconds !== "number" || seconds < 0) {
    throw new Error(
      `Invalid wait duration: ${seconds}. Must be a non-negative number.`
    );
  }

  const maxWaitSeconds = 300;
  const actualWaitSeconds = Math.min(seconds, maxWaitSeconds);

  if (seconds > maxWaitSeconds) {
    console.warn(
      `Wait duration capped at ${maxWaitSeconds} seconds (requested: ${seconds} seconds)`
    );
  }

  const waitMs = actualWaitSeconds * 1000;
  const startTime = Date.now();

  return new Promise((resolve) => {
    setTimeout(() => {
      const actualDuration = (Date.now() - startTime) / 1000;
      console.log(
        `Wait completed. Requested: ${actualWaitSeconds}s, Actual: ${actualDuration.toFixed(
          2
        )}s`
      );
      resolve();
    }, waitMs);
  });
}
