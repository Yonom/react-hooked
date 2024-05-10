import { Observer, Unsubscribable } from "rxjs";

import QueryResultFactory from "./QueryResultFactory";
import { QueryCompletedWithoutValueError } from "./errors";
import {
  COMPLETE_TOKEN,
  QueryNotification,
  QueryObservable,
  QueryResult,
  QuerySubscriber,
  RESET_TOKEN,
} from "./types";

export class QueryBehaviorSubject<T> implements Observer<T> {
  private readonly subscribers = new Set<QuerySubscriber<T>>();

  public result: QueryResult<T> | undefined;

  private isFinalized = false;

  private subscription: Unsubscribable | undefined;

  public get subscriberCount() {
    return this.subscribers.size;
  }

  public reset() {
    this._notifySubscribers(RESET_TOKEN);
  }

  public connect(observable: QueryObservable<T>) {
    if (this.subscription != null) return;
    const obs = typeof observable === "function" ? observable() : observable;
    this.subscription = obs.subscribe(this);
  }

  public disconnect() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  public addSubscriber(subscriber: QuerySubscriber<T>) {
    this.subscribers.add(subscriber);

    // TODO test
    if (this.result !== undefined && this.result.status !== "pending") {
      subscriber(this.result);

      if (this.result.status === "fulfilled" && this.isFinalized) {
        subscriber(COMPLETE_TOKEN);
      }
    }

    return () => this.subscribers.delete(subscriber);
  }

  public next(value: T) {
    if (this.isFinalized) {
      throw new Error("Cannot set value on finalized query");
    }

    // keep the result reference the same if the value is the same
    const result =
      this.result?.status !== "fulfilled" || this.result.value !== value
        ? QueryResultFactory.fulfill(value)
        : this.result;

    this._notifySubscribers(result);
  }

  public error(error: unknown) {
    if (this.isFinalized) {
      throw new Error("Cannot set error on finalized query");
    }

    this._notifySubscribers(QueryResultFactory.reject(error));
  }

  public complete() {
    if (this.isFinalized) {
      throw new Error("Cannot complete a finalized query");
    }

    this._notifySubscribers(COMPLETE_TOKEN);
  }

  private currentIterator: Iterator<QuerySubscriber<T>> | undefined;

  private _notifySubscribers = (result: QueryNotification<T>) => {
    // if we are inside a re-enterant dispatch, flush the previous iterator first
    if (this.currentIterator) {
      this.flushIterator();
    }

    if (result === RESET_TOKEN) {
      this.result = undefined;
      this.isFinalized = false;
    } else if (result === COMPLETE_TOKEN) {
      if (this.result?.status !== "fulfilled") {
        this.result = QueryResultFactory.reject(
          new QueryCompletedWithoutValueError(),
        );
      }
      this.isFinalized = true;
    } else {
      this.result = result;
      this.isFinalized = result.status === "rejected";
    }

    this.currentIterator = this.subscribers.values();
    this.flushIterator();
    this.currentIterator = undefined;
  };

  private flushIterator = () => {
    let notification: QueryNotification<T>;
    if (this.result === undefined) {
      notification = RESET_TOKEN;
    } else if (this.result.status !== "rejected" && this.isFinalized) {
      notification = COMPLETE_TOKEN;
    } else {
      notification = this.result;
    }

    let result;
    while ((result = this.currentIterator?.next()) && !result.done) {
      try {
        result.value(notification);
      } catch (ex) {
        console.error(ex);
      }
    }
  };
}
