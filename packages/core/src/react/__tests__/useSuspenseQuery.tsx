import { describe, expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { Fragment } from "react";
import { withErrorBoundary } from "react-error-boundary";
import { delay, mergeMap, of, throwError, timer } from "rxjs";

import { getQueryKey } from "../../__tests__/test-utils";
import { Query } from "../../types";
import useSuspenseQuery from "../useSuspenseQuery";

jest.useFakeTimers();

describe("useSuspenseQuery", () => {
  test("suspense - resolve", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test").pipe(delay(5)),
    } satisfies Query<string>;
    const { result } = renderHook(() => useSuspenseQuery(testQuery));

    expect(result.current).toBe(null);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10);
    });

    expect(result.current).toBe("test");
  });

  test("suspense - reject", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: timer(5).pipe(
        mergeMap(() => throwError(() => new Error("error"))),
      ),
    } satisfies Query<string>;

    let error;
    const { result } = renderHook(() => useSuspenseQuery(testQuery), {
      wrapper: withErrorBoundary(Fragment, {
        fallback: null,
        onError: (e) => {
          error = e;
        },
      }),
    });

    expect(result.current).toBe(null);
    expect(error).toBe(undefined);

    // supress console.error
    const consoleMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => jest.fn());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10);
    });
    consoleMock.mockRestore();

    expect(error).toHaveProperty("message", "error");
  });

  test("multiple hook suspend - under 30s", async () => {
    const { result } = renderHook(() => {
      const res = useSuspenseQuery({
        key: getQueryKey(),
        observable: of("test").pipe(delay(5)),
      });

      useSuspenseQuery({
        key: getQueryKey() + " suspend",
        observable: of("test").pipe(delay(1000)),
      });

      return res;
    });

    expect(result.current).toBe(null);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    // await expectFullfilledResult(result.current, "test");
  });
});
