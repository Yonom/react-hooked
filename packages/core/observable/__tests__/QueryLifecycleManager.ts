import { describe, expect, jest, test } from "@jest/globals";

import QueryLifecycleManager from "../QueryLifecycleManager";

const expectDisposed = async (
  lifecycle: QueryLifecycleManager,
  isDisposed: boolean,
) => {
  await jest.advanceTimersByTimeAsync(0);
  expect(lifecycle.isDisposed).toBe(isDisposed);
};

jest.useFakeTimers();

describe("QueryLifecycleManager", () => {
  test("immediate autodispose", async () => {
    const lifecycle = new QueryLifecycleManager();

    // it should not dispose in the same tick
    expect(lifecycle.isDisposed).toBe(false);

    // it should dispose in the next event loop tick
    await expectDisposed(lifecycle, true);
  });

  test("manual dispose", async () => {
    let disposed = false;
    const lifecycle = new QueryLifecycleManager();
    lifecycle.addTeardownCallback(() => {
      disposed = true;
    });

    const release = lifecycle.retain();
    expect(() => lifecycle.dispose()).toThrowError(
      "Cannot dispose query with permanent retains",
    );
    release();

    lifecycle.dispose();

    // it should immediately dispose
    expect(lifecycle.isDisposed).toBe(true);
    expect(disposed).toBe(true);
  });

  test("reset", async () => {
    const lifecycle = new QueryLifecycleManager();

    lifecycle.idleRetain(Infinity);
    lifecycle.temporaryRetain(Infinity);
    const release = lifecycle.retain();

    lifecycle.reset();

    await expectDisposed(lifecycle, false);

    release();

    await expectDisposed(lifecycle, true);
  });

  test("dispose callback", async () => {
    let disposed = false;
    const lifecycle = new QueryLifecycleManager();
    lifecycle.addTeardownCallback(() => {
      if (disposed) {
        throw new Error("dispose callback called twice");
      }
      disposed = true;

      expect(lifecycle.isDisposed).toBe(true);
    });

    // ensure dispose is not called
    expect(disposed).toBe(false);

    // ensure dispose is called
    await jest.advanceTimersByTimeAsync(0);
    expect(disposed).toBe(true);

    expect(() => lifecycle.retain()).toThrowError(
      "Cannot retain disposed query",
    );
    expect(() => lifecycle.idleRetain(0)).toThrowError(
      "Cannot retain disposed query",
    );
    expect(() => lifecycle.temporaryRetain(0)).toThrowError(
      "Cannot retain disposed query",
    );
    expect(() => lifecycle.releaseTemporaryRetain()).toThrowError(
      "Cannot retain disposed query",
    );
    expect(() => lifecycle.dispose()).toThrowError(
      "Cannot dispose disposed query",
    );
    expect(() => lifecycle.reset()).toThrowError("Cannot reset disposed query");
  });

  test("permanent retain", async () => {
    const lifecycle = new QueryLifecycleManager();

    const release = lifecycle.retain();

    await expectDisposed(lifecycle, false);

    release();
    release();
    release();

    const release2 = lifecycle.retain();
    const release3 = lifecycle.retain();

    await expectDisposed(lifecycle, false);

    release3();

    await expectDisposed(lifecycle, false);

    release2();

    await expectDisposed(lifecycle, true);
  });

  test("idle retain", async () => {
    const lifecycle = new QueryLifecycleManager();

    lifecycle.idleRetain(10);
    lifecycle.idleRetain(5);

    await jest.advanceTimersByTimeAsync(5);
    await expectDisposed(lifecycle, false);

    await jest.advanceTimersByTimeAsync(5);
    await expectDisposed(lifecycle, true);
  });

  test("temporary retain", async () => {
    const lifecycle = new QueryLifecycleManager();

    lifecycle.temporaryRetain(10);
    lifecycle.temporaryRetain(5);

    await jest.advanceTimersByTimeAsync(5);
    await expectDisposed(lifecycle, false);

    await jest.advanceTimersByTimeAsync(5);
    await expectDisposed(lifecycle, true);
  });

  test("idle+permanent retain", async () => {
    const lifecycle = new QueryLifecycleManager();

    lifecycle.idleRetain(5);
    const release = lifecycle.retain();

    await jest.advanceTimersByTimeAsync(5);
    await expectDisposed(lifecycle, false);

    release();

    await expectDisposed(lifecycle, true);
  });

  test("idle+temporary retain", async () => {
    const lifecycle = new QueryLifecycleManager();

    lifecycle.temporaryRetain(10);
    lifecycle.idleRetain(5);

    await expectDisposed(lifecycle, false);

    lifecycle.releaseTemporaryRetain();

    await expectDisposed(lifecycle, false);

    await jest.advanceTimersByTimeAsync(5);
    await expectDisposed(lifecycle, true);
  });

  test("retain expiresAfterMs must be positive", async () => {
    const lifecycle = new QueryLifecycleManager();

    expect(() => lifecycle.temporaryRetain(0)).toThrowError(
      "expiresAfterMs must be positive",
    );
    expect(() => lifecycle.temporaryRetain(NaN)).toThrowError(
      "expiresAfterMs must be positive",
    );
    expect(() => lifecycle.idleRetain(0)).toThrowError(
      "expiresAfterMs must be positive",
    );
    expect(() => lifecycle.idleRetain(NaN)).toThrowError(
      "expiresAfterMs must be positive",
    );
  });
});
