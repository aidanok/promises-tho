
Couple of **T**ypescript **h**igher **o**rder functions for use with promise based network or other IO apis.

`npm install promises-tho`

Packaged using @pika/pack for web,node,typescript,javascript & deno.

Why use this? 

I got tired of writing  `while(--tries) await something ` type loops and
other on the fly stuff, but here's why you might want to use it:  

- Keeps type signatures if you are using TypeScript. 
- Sensible defaults for use in browser scenarios, where concurrent requests are limited.
- Easily tweakable options, use it in nodejs/server side too.
- Just a few simple, composable functions
  - `retryWithBackoff` - Wraps a promise returning function with retries and exponential backoff. 
  - `batch` - Splits a large group of operations into batches 
  - `batchWithProgress` - Splits a large group of operations into batches while returning intermediate results. 


Uses https://www.npmjs.com/package/debug for logging, using the `promises-tho` namespace. enable `promises-tho:*` in your environment to see retries, timings, delays etc.  

See [src/](src/) for JsDoc full options & defaults.  

Quick examples:

### Retry with backoff

```typescript 

import { retryWithBackoff } from "promises-tho";

// some promise returning function. 
const getSomething = async (id: number) => fetch(`http://example.com/api/foo/${id}`).then(x => x.json() as Foo)

const getSomethingWithRetries = retryWithBackoff(getSomething); 

// getSomethingWithRetries will have the same type signature as the original.  
const foo = await getSomethingWithRetries(myFooId);

```

```typescript

// same but set some options
const reallyGetSomething = retryWithBackoff({ tries: 100, pow: 1.2 }, getSomething); 

const foo = await reallyGetSomething(myFooId);


```

### Batching

```typescript

import { batch, retryWithBackoff } from "promises-tho";

const getSomethingWithRetries = retryWithBackoff(getSomething); 

const getSomethingBatched = batch({ batchSize: 4, batchDelay: 150 }, getSomethingWithRetries); 

// if getSomething was typed as (x: number) => Promise<Foo> , 
// getSomethingBatched will be typed as (x: number[]) => Promise<Foo[]>

const results = await getSomethingBatched([1,2,3,4,5,6,7,8,9]);


```

getSomethingBatched will exectue `getSomethingWithRetries` 4 items at a time, delaying 150ms between batches, 
and returning when the entire batch is complete. The options argument is optional, values shown are the default.

Note we wrap the original `getSomething` with retries/backoff and then use that function for the batching.


### Batching with intermediate results


```typescript

import { batchWithProgress, retryWithBackoff } from "promises-tho";

const getSomethingWithRetries = retryWithBackoff(getSomething); 

const getSomethingBatched = batchWithProgress(getSomethingWithRetries); 

// assuming getSomething returns Promise<Foo>
let job = {
  pending: [1,2,3,4,5,6,7],
  completed: [] as Foo[],
  batched: 0 // just to make compatible type for below, alternatively use type annotation with let.    
}

while (job.pending.length) {
  
  // Execute the next batch (4 items by default)
  job = await getSomethingBatched(job);

  if (job.batched) {
    // .batched is the number of results put into completed array in the last iteration.
    // get the last N from the `.completed` array by passing a negative index to slice, 
    const latestThingsWeGot = job.completed.slice(-job.batched); 
    // do something with the results from the latest iteration, maybe diplay in UI 
    // or some start some other dependent async work. 
  }
}

// finished, so 
// job.pending.length === 0
// job.completed = [...all the results...]

```

You are free to modify the `completed` array during iteration if you want, it just gets appended to. 
The `pending` array will have items removed during iteration, so if you need to, keep a copy of it 
before you start. The delay will be applied between iterations (default 150ms), starting only with the 
2nd batch.


NOTE: `retryWithBackoff` will wrap a function with any number of arguments, but the batching functions
will only wrap a function with **exactly one argument** . This is the most common case and makes for much 
nicer ergonomics. If you need to, you can make a small wrapper to your function to take only one argument.






