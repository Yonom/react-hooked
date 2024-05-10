class QueryLifecycleManager {
  private _permanentRetainCount = 0;
  private _temporaryRetainExpiresAt = 0;
  private _idleRetainExpiresAt = 0;

  private _disposeTimeoutId: NodeJS.Timeout | undefined;
  private _disposeAt = Infinity;
  private _isDisposed = false;

  private readonly _teardownCallbacks: (() => void)[] = [];

  constructor() {
    this._updateTimeout();
  }

  public get isDisposed() {
    return this._isDisposed;
  }

  public addTeardownCallback(cb: () => void) {
    this._teardownCallbacks.push(cb);
  }

  public dispose() {
    if (this._isDisposed) {
      throw new Error("Cannot dispose disposed query");
    }
    if (this._permanentRetainCount > 0) {
      throw new Error("Cannot dispose query with permanent retains");
    }

    this._isDisposed = true;
    clearTimeout(this._disposeTimeoutId);
    this._teardownCallbacks.forEach((cb) => cb());
  }

  public reset() {
    if (this._isDisposed) {
      throw new Error("Cannot reset disposed query");
    }

    this._idleRetainExpiresAt = 0;
    this._temporaryRetainExpiresAt = 0;
    this._updateTimeout();
  }

  private _updateTimeout() {
    const maxExpiresAt = Math.max(
      this._permanentRetainCount > 0 ? Infinity : 0,
      this._idleRetainExpiresAt,
      this._temporaryRetainExpiresAt,
    );

    // perf: if the new maxExpiresAt is the same as the old one, do nothing
    if (this._disposeAt === maxExpiresAt) return;
    this._disposeAt = maxExpiresAt;

    // clear the previous timeout
    clearTimeout(this._disposeTimeoutId);
    this._disposeTimeoutId = undefined;

    if (this._disposeAt !== Infinity) {
      const expiresAfterMs = Math.max(
        0,
        this._disposeAt - new Date().getTime(),
      );
      this._disposeTimeoutId = setTimeout(() => {
        this._disposeTimeoutId = undefined;

        this.dispose();
      }, expiresAfterMs);
    }
  }

  // idle retains
  public idleRetain(expiresAfterMs: number) {
    if (this._isDisposed) {
      throw new Error("Cannot retain disposed query");
    }

    if (!(expiresAfterMs > 0)) {
      throw new Error("expiresAfterMs must be positive");
    }

    const newExpiresAt = new Date().getTime() + expiresAfterMs;
    if (newExpiresAt <= this._idleRetainExpiresAt) return;

    this._idleRetainExpiresAt = newExpiresAt;
    this._updateTimeout();
  }

  // temporary retain
  public temporaryRetain(expiresAfterMs: number) {
    if (this._isDisposed) {
      throw new Error("Cannot retain disposed query");
    }

    if (!(expiresAfterMs > 0)) {
      throw new Error("expiresAfterMs must be positive");
    }

    const newExpiresAt = new Date().getTime() + expiresAfterMs;
    if (newExpiresAt <= this._temporaryRetainExpiresAt) return;

    this._temporaryRetainExpiresAt = newExpiresAt;
    this._updateTimeout();
  }

  public releaseTemporaryRetain() {
    if (this._isDisposed) {
      throw new Error("Cannot retain disposed query");
    }

    this._temporaryRetainExpiresAt = 0;
    this._updateTimeout();
  }

  public retain() {
    if (this._isDisposed) {
      throw new Error("Cannot retain disposed query");
    }

    let released = false;
    this._permanentRetainCount++;
    this._updateTimeout();

    return () => {
      if (released) return;

      released = true;
      this._permanentRetainCount--;
      this._updateTimeout();
    };
  }
}

export default QueryLifecycleManager;
