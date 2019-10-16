import debug from "debug";
import { PromiseReturningOneArg } from "./types";

interface Options {
  batchSize?: number
  batchDelayMs?: number  
}

/**
 * Wraps a Promise returning function that you want to call in batches. 
 * This version will only return once the entire batch is complete.  
 * 
 * Note: fn must take exactly one argument. If you need to use a function taking 
 * multiple arguments, make a small wrapper. 
 * 
 * @param opts options
 * @param opts.batchSize default 4. the number of concurrent executions of fn
 * @param opts.batchDelayMs default 150. milliseconds to delay between batches. Only applied from the 2d batch onwards. 
 * @param fn the function to wrap
 *
 */

export function batchWithoutProgress<T extends PromiseReturningOneArg<P, R>, P, R>
  (optsOrFn: Options | T, fn?: T, opts?: Options): (params: P[])=> Promise<R[]> {

  if (!fn) {
    fn = optsOrFn as T;
    optsOrFn = undefined as any;
  }
  
  const log =  debug('promises-tho:batch');
  
  const options = 
    Object.assign({
      batchSize: 4,
      batchDelayMs: 150,
    },
  optsOrFn);
  


  return async function(requests: P[]): Promise<R[]> {

    const context = {
      pending: requests,
      completed: [] as R[],
    }

    const t0 = Date.now();

    while (context.pending.length > 0) {
      const t1 = Date.now(); 
      const batch = context.pending.slice(0, options.batchSize).map(x => fn!(x))
      const results = await Promise.all(batch);
      context.completed = context.completed.concat(results);
      context.pending = context.pending.slice(options.batchSize);
     
     log(`Batch of ${results.length} took ${(Date.now() - t1) / 1000} seconds`);

      if (context.pending.length > 0) {
        const delayMs = options.batchDelayMs;
        log(`Delaying ${(Date.now() - t1) / 1000} seconds between batches`);
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    
    log(`Total Batch of ${context.completed.length} took ${(Date.now() - t0) / 1000} seconds`);

    return context.completed;
  }
}
