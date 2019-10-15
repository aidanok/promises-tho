import debug from "debug";

type Options = { tries?: number, startMs?: number, pow?: number, maxMs?: number, jitter?: number };

/**
 * 
 * Wrap any Promise returning function with retries and backoff.
 * Sensible defaults for typical interactive networking 
 * scenarios, such as browser requests. 
 * 
 * Default settings will result in delays of (in ms):
 * 250, 2000, 6750, 16000, 31250 
 * 
 * @param func           - the function to wrap.
 * @param opts           - options
 * @param opts.tries     - default 6, Maximum attempts, including initial try. 
 * @param opts.startMs   - default 250, statring delay after the first failure 
 * @param opts.pow       - default 3, Backoff power. float values are fine.
 * @param opts.maxMs     - default 300000 (5 minutes), upper limit on the delay. Won't be reached with default settings.
 * @param opts.jitter    - default 0.25, amount of jitter to apply. Removes a random value (0-N*delay) from delay. 
 */

export function retryWithBackoff<R, T extends (...args: any[]) => Promise<R>>
  (
    func: T,
    {
      tries = 6,
      startMs = 250,
      pow = 3,
      maxMs = 300000,
      jitter = 0.25,
    }: Options = {}
  ): T {
  
  return async function(...args: Parameters<T>): Promise<R> {
    let errors = 0;
    while(true) {
      try {
        return await func(...args);
      } catch (e) {
        if (++errors === tries) {
          throw(e);
        } else {
          let delay = Math.min(maxMs, startMs*Math.pow(errors,pow));
          delay = delay - (Math.random() * delay * jitter);
          debug('promise-tho:retry-with-backoff')
            (`${func.name} failed, retrying in ${delay.toFixed(0)}ms`);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
  } as any; // as any WHY??? 
}