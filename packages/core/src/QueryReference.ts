import { QueryBehaviorSubject } from "./QueryBehaviorSubject";
import QueryLifecycleManager from "./QueryLifecycleManager";
import QueryResultFactory from "./QueryResultFactory";
import type { QueryObservable, QueryResult, QuerySubscriber } from "./types";

export default class QueryReference<T> {
  private readonly lifecycle = new QueryLifecycleManager();
  private readonly subject;

  public constructor(
    observable: QueryObservable<T>,
    setup?: (ref: QueryReference<T>) => void,
    teardown?: () => void,
  ) {
    this.subject = new QueryBehaviorSubject<T>();

    setup?.(this);
    if (this.lifecycle.isDisposed) return; // setup handler called reset

    this.subject.connect(observable);
    this.lifecycle.addTeardownCallback(() => {
      this.subject.disconnect();
      teardown?.();
    });
  }

  public get isDisposed() {
    return this.lifecycle.isDisposed;
  }

  public idleRetain(expiresAfterMs: number) {
    return this.lifecycle.idleRetain(expiresAfterMs);
  }

  public temporaryRetain(expiresAfterMs: number) {
    return this.lifecycle.temporaryRetain(expiresAfterMs);
  }

  public releaseTemporaryRetain() {
    return this.lifecycle.releaseTemporaryRetain();
  }

  public reset(observable: QueryObservable<T>) {
    if (this.lifecycle.isDisposed) {
      throw new Error("Cannot reset a disposed query");
    }

    this.subject.reset();
    // TODO test
    if (this.lifecycle.isDisposed) return; // reset handler called reset reenterantly

    if (this.subject.subscriberCount > 0) {
      this.lifecycle.reset();

      // if there are existing subscribers, reconnect to the observable
      this.subject.disconnect();
      this.subject.connect(observable);
    } else {
      this.lifecycle.dispose();
    }
  }

  public get result(): QueryResult<T> {
    // TODO test
    if (this.lifecycle.isDisposed) {
      throw new Error("Cannot access result of disposed query");
    }

    if (this.subject.result) return this.subject.result;

    this.subject.result = QueryResultFactory.pending(this);
    return this.subject.result;
  }

  public subscribe(callback: QuerySubscriber<T>): () => void {
    if (this.lifecycle.isDisposed) {
      throw new Error("Cannot subscribe to disposed query");
    }

    const releaseRetain = this.lifecycle.retain();
    const unsubscribe = this.subject.addSubscriber(callback);

    return () => {
      unsubscribe();
      releaseRetain();
    };
  }
}
