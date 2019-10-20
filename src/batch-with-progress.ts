import debug from 'debug';
import { FunctionReturningPromise, PromiseReturnType, OneArgFunctionReturningPromise } from './types';

export interface BatchJob<P, R> {
  pending: P[],
  completed: R[],
  batched?: number,
  inProgress?: boolean, 
}

interface Options {
  batchSize?: number
  batchDelayMs?: number  
}



/**
 * Wraps a Promise returning function that you want to call in batches. 
 * This version passes back intermediate results to the caller, who can do something 
 * with the partially completed batch results and pass back in the Job to continue. 
 * Could be used to update a UI, start some depedent work, etc, without having to wait 
 * for the whole batch to complete.
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

export function batchWithProgress<P, R>
  (optsOrFn: Options | OneArgFunctionReturningPromise<P, R>, fn?: OneArgFunctionReturningPromise<P, R>) : (job: BatchJob<P, R>) => Promise<BatchJob<P, R>>
  {
  
  if (!fn) {
    fn = optsOrFn as OneArgFunctionReturningPromise<P, R>;
    optsOrFn = undefined as any;
  }
  const log = debug('promises-tho:batch-with-progress');

  const options = 
    Object.assign({
      batchSize: 4,
      batchDelayMs: 150,
    },
  optsOrFn);

  return async function(job: BatchJob<P, R>): Promise<BatchJob<P, R>> {
    
    // Copy job as to not mutate our arguments, 
    // we shouldn't modify the arrays directly either. 
    // as the caller may want to keep around the original 
    // data they pass in.

    // Check for caller fck up 
    if ((job as any).inProgress === false) {
      throw new Error('This job is already completed.');
    }
    
    const current: BatchJob<P, R> = Object.assign({ inProgress: true, batched: 0 }, job);

    if (current.pending.length > 0) {
      if (current.inProgress) {
        // we are in progress, want to delay a bit before next batch.
        // This wont be set on the first batch.
        const delayMs = options.batchDelayMs;
        await new Promise(res => setTimeout(res, delayMs));
      }
      const t1 = Date.now(); 
      const batch = current.pending.slice(0, options.batchSize).map(x => fn!(x))
      const results = await Promise.all(batch);
      current.completed = current.completed.concat(results);
      current.pending = current.pending.slice(options.batchSize);
      current.inProgress === current.pending.length > 0;
      current.batched = batch.length;  

      log(`Batch of ${results.length} took ${(Date.now() - t1) / 1000} seconds`);
    }

    if (!current.inProgress) {
      log(`Batch complete`);
    }
    return current;
  }
}


