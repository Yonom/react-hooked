import type { Observable, Subscribable } from "rxjs";

export type Query<T> = {
  readonly key: string;
  readonly observable: QueryObservable<T>;
  readonly disconnectAfterIdleMs?: number;
};

export interface PendingQueryResult<T> extends Promise<T> {
  status: "pending";
  value?: undefined;
  reason?: undefined;
}

export interface FulfilledQueryResult<T> extends Promise<T> {
  status: "fulfilled";
  value: T;
  reason?: undefined;
}

export interface RejectedQueryResult<T> extends Promise<T> {
  status: "rejected";
  reason: unknown;
  value?: undefined;
}

export type QueryResult<T> =
  | PendingQueryResult<T>
  | FulfilledQueryResult<T>
  | RejectedQueryResult<T>;

export const RESET_TOKEN = Symbol("QUERY_RESET_TOKEN");
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type RESET_TOKEN = typeof RESET_TOKEN;
export const COMPLETE_TOKEN = Symbol("QUERY_COMPLETE_TOKEN");
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type COMPLETE_TOKEN = typeof COMPLETE_TOKEN;

export type QueryNotification<T> =
  | RESET_TOKEN
  | COMPLETE_TOKEN
  | QueryResult<T>;

export type QuerySubscriber<T> = (result: QueryNotification<T>) => void;

export type QueryObservable<T> =
  | Subscribable<T>
  | (() => Subscribable<T>)
  | Observable<T>
  | (() => Observable<T>);
