
// Some helper types. 

export type PromiseReturning<R = any> = (...args: any[]) => Promise<R>

export type PromiseReturningOneArg<P = any, R = any> = (arg: P) => Promise<R>

export type PromiseReturnType<T> = T extends (...args: any[])=>Promise<infer U> ? U : unknown;

