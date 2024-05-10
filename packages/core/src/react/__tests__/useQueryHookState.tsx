import { describe, expect, jest, test } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { useEffect } from "react";
import { delay, of, throwError } from "rxjs";

import QueryStore from "../../QueryStore";
import {
  getQueryKey,
  expectFullfilledResult,
  expectRejectedResult,
} from "../../__tests__/test-utils";
import resetQuery from "../../helpers/resetQuery";
import type { Query } from "../../types";
import useQueryHookState from "../useQueryHookState";

jest.useFakeTimers();

describe("useQueryHookState", () => {
  test("stable refs", async () => {
    const useTest = () => {
      const state = useQueryHookState({
        key: getQueryKey(),
        observable: of("test"),
        disconnectAfterIdleMs: 10,
      });

      return state;
    };

    const { result, rerender } = renderHook(useTest);

    const result1 = result.current;
    rerender();
    const result2 = result.current;

    expect(result1).toBe(result2);
  });

  test("reset on render", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
    };
    const useTest = () => {
      const state = useQueryHookState(testQuery);
      useEffect(() => resetQuery(testQuery), []);
      useEffect(() => state.subscribe(() => {}), [state]);
      return state;
    };

    const { result, rerender } = renderHook(useTest);

    const result1 = result.current;
    rerender();
    const result2 = result.current;
    rerender();
    const result3 = result.current;

    expect(result1).not.toBe(result2);
    expect(result2).toBe(result3);
  });

  test("effect - on unmounted read - idle retain", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
      disconnectAfterIdleMs: 10,
    };
    const useTest = () => {
      useQueryHookState(testQuery);

      throw new Promise(() => {});
    };

    const { unmount } = renderHook(useTest);
    unmount();

    QueryStore.get(testQuery)?.releaseTemporaryRetain();

    await jest.advanceTimersByTimeAsync(0);
    expect(QueryStore.get(testQuery)).not.toBeUndefined();

    await jest.advanceTimersByTimeAsync(10);
    expect(QueryStore.get(testQuery)).toBeUndefined();
  });

  test("effect - on unmounted read - temp retain", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
    };
    const useTest = () => {
      useQueryHookState(testQuery);

      throw new Promise(() => {});
    };

    const { unmount } = renderHook(useTest);
    unmount();

    await jest.advanceTimersByTimeAsync(60_000);
    expect(QueryStore.get(testQuery)).not.toBeUndefined();

    QueryStore.get(testQuery)?.releaseTemporaryRetain();

    await jest.advanceTimersByTimeAsync(0);
    expect(QueryStore.get(testQuery)).toBeUndefined();
  });

  test("effect - on unmounted read - settle retain", async () => {
    const longTime = 10 * 60_000;
    const testQuery = {
      key: getQueryKey(),
      observable: of("test").pipe(delay(longTime)),
    };
    const useTest = () => {
      useQueryHookState(testQuery);

      throw new Promise(() => {});
    };

    const { unmount } = renderHook(useTest);
    unmount();

    QueryStore.get(testQuery)?.releaseTemporaryRetain();

    await jest.advanceTimersByTimeAsync(longTime + 500);
    expect(QueryStore.get(testQuery)).not.toBeUndefined();

    await jest.advanceTimersByTimeAsync(500);
    expect(QueryStore.get(testQuery)).toBeUndefined();
  });

  // test("effect - on unmounted read - no settle retain on sync resolve", async () => {
  //   const testQuery = {
  //     key: getQueryKey(),
  //     observable: of("test"),
  //   };
  //   const useTest = () => {
  //     useQueryHookState(testQuery);

  //     throw new Promise(() => {});
  //   };

  //   const { unmount } = renderHook(useTest);
  //   unmount();

  //   QueryStore.get(testQuery)?.releaseTemporaryRetain();

  //   await jest.advanceTimersByTimeAsync(0);
  //   expect(QueryStore.get(testQuery)).toBeUndefined();
  // });

  test("effect - on mount - release temp retain", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
    };
    const useTest = () => {
      const state = useQueryHookState(testQuery);
      useEffect(() => state.subscribe(() => {}), [state]);
    };

    const { rerender, unmount } = renderHook(useTest);
    rerender();
    unmount();

    await jest.advanceTimersByTimeAsync(0);
    expect(QueryStore.get(testQuery)).toBeUndefined();
  });

  test("effect - on unmount - idle retain", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
      disconnectAfterIdleMs: 10,
    };
    const useTest = () => {
      const state = useQueryHookState(testQuery);
      useEffect(() => state.subscribe(() => {}));
    };

    const { unmount } = renderHook(useTest);

    await jest.advanceTimersByTimeAsync(1000);
    unmount();

    await jest.advanceTimersByTimeAsync(10);
    expect(QueryStore.get(testQuery)).toBeUndefined();
  });

  test("switch query", async () => {
    const query1 = {
      key: `${getQueryKey()} 1`,
      observable: of("test"),
    } satisfies Query<string>;
    const query2 = {
      key: `${getQueryKey()} 2`,
      observable: of("test2"),
    } satisfies Query<string>;

    const { result, rerender } = renderHook(
      ({ query }) => useQueryHookState(query),
      {
        initialProps: { query: query1 },
      },
    );

    await expectFullfilledResult(result.current.getResult(), "test");

    rerender({ query: query2 });

    await expectFullfilledResult(result.current.getResult(), "test2");
  });

  test("sync render fulfill", async () => {
    const { result } = renderHook(() =>
      useQueryHookState({
        key: getQueryKey(),
        observable: of("test"),
      }),
    );

    await expectFullfilledResult(result.current.getResult(), "test");
  });

  test("sync render reject", async () => {
    const { result } = renderHook(() =>
      useQueryHookState({
        key: getQueryKey(),
        observable: throwError(() => new Error("error")),
      }),
    );

    await expectRejectedResult(result.current.getResult(), "error");
  });
});
