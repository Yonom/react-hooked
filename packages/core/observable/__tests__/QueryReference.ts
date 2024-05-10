import { describe, expect, jest, test } from "@jest/globals";
import { EMPTY, NEVER, delay, from, of, tap, throwError } from "rxjs";

import {
  expectFullfilledResult,
  expectPendingResult,
  expectRejectedResult,
} from "./test-utils";
import QueryReference from "../QueryReference";

jest.useFakeTimers();

describe("QueryReference", () => {
  test("subscribe during initializer", async () => {
    let count = 0;
    const ref = new QueryReference(from([1, 2, 3]), (ref) => {
      ref.subscribe(() => {
        count++;
      });
    });

    const result = ref.result;

    expect(count).toBe(4);
    expect(count).toBe(4);

    await expectFullfilledResult(result, 3);
  });

  test("sync rejected observable", async () => {
    const ref = new QueryReference(throwError(() => new Error("error")));

    await expectRejectedResult(ref.result, "error");
  });

  test("sync fulfilled observable", async () => {
    const ref = new QueryReference(of("test"));

    await expectFullfilledResult(ref.result, "test");
  });

  test("sync empty observable", async () => {
    const ref = new QueryReference(EMPTY);

    await expectRejectedResult(
      ref.result,
      "Query completed without emitting a value",
    );
  });

  test("auto dispose", async () => {
    const ref = new QueryReference(NEVER);

    await jest.advanceTimersByTimeAsync(0);
    expect(ref.isDisposed).toBe(true);
  });

  test("reset->dispose", async () => {
    const ref = new QueryReference(NEVER);

    ref.reset(NEVER);
    expect(ref.isDisposed).toBe(true);
  });

  test("reset->dispose in initializer", async () => {
    let subbed = false;
    const observable = NEVER.pipe(
      tap({
        subscribe: () => {
          subbed = true;
        },
      }),
    );
    const ref = new QueryReference(observable, (ref) => {
      ref.reset(observable);
    });

    expect(subbed).toBe(false);

    expect(ref.isDisposed).toBe(true);
  });

  test("stable result ref", () => {
    const ref = new QueryReference(NEVER);

    expect(ref.result).toBe(ref.result);
  });

  test("reset with subscriber", async () => {
    let subCount = 0;
    const observable = NEVER.pipe(
      tap({
        subscribe: () => {
          subCount++;
        },
      }),
    );
    const ref = new QueryReference(observable);

    expect(subCount).toBe(1);

    const unsusbscribe = ref.subscribe(() => {});
    ref.reset(observable);

    expect(subCount).toBe(2);
    expect(ref.isDisposed).toBe(false);

    unsusbscribe();
    ref.reset(observable);

    expect(subCount).toBe(2);
    expect(ref.isDisposed).toBe(true);
  });

  test("stable result ref", async () => {
    const ref = new QueryReference(EMPTY);

    ref.temporaryRetain(Infinity);
    ref.releaseTemporaryRetain();

    await jest.advanceTimersByTimeAsync(0);
    expect(ref.isDisposed).toBe(true);
  });

  test("lifecycle activation", async () => {
    const ref = new QueryReference(of("test").pipe(delay(10)));

    const result = ref.result;
    expectPendingResult(result);

    await jest.advanceTimersByTimeAsync(5);
    expect(ref.isDisposed).toBe(false);

    ref.temporaryRetain(10);

    await jest.advanceTimersByTimeAsync(5);
    expect(ref.isDisposed).toBe(false);

    await jest.advanceTimersByTimeAsync(5);
    expect(ref.isDisposed).toBe(true);
  });

  test("dispose", async () => {
    const ref = new QueryReference(of("test"));

    expect(ref.isDisposed).toBe(false);

    await jest.advanceTimersByTimeAsync(0);
    expect(ref.isDisposed).toBe(true);

    expect(() => ref.subscribe(() => {})).toThrow(
      "Cannot subscribe to disposed query",
    );
    expect(() => ref.reset(NEVER)).toThrow("Cannot reset a disposed query");
  });
});
