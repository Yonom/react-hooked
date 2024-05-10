import { describe, expect, jest, test } from "@jest/globals";
// import failOnConsole from "jest-fail-on-console";
import { merge, of, throwError } from "rxjs";

import { getQueryKey } from "../../__tests__/test-utils";
import type { Query } from "../../types";
import resetQuery from "../resetQuery";
import { subscribeToQuery } from "../subscribeToQuery";

// TODO Fix this
// ensure throws inside subscribeToQuery get caught
// failOnConsole();

jest.useFakeTimers();

describe("subscribeToQuery", () => {
  test("subscribe -> complete -> reset", () => {
    const values = [] as (string | Error)[];
    const query = {
      key: getQueryKey(),
      observable: of("test"),
    };
    subscribeToQuery(query, {
      next: (v) => {
        values.push(v);
      },
      complete: () => {
        values.push("COMPLETE");
      },
      reset: () => {
        values.push("RESET");
      },
    });

    resetQuery(query);

    expect(values).toEqual(["test", "COMPLETE", "RESET", "test", "COMPLETE"]);
  });

  test("subscribe -> error", () => {
    const values = [] as (string | Error)[];
    subscribeToQuery(
      {
        key: getQueryKey(),
        observable: merge(
          of("test"),
          throwError(() => new Error("error")),
        ),
      },
      {
        next: (v) => {
          values.push(v);
        },
        error: (e) => {
          values.push(e);
        },
      },
    );

    expect(values).toEqual(["test", new Error("error")]);
  });

  test("retain with disconnectAfterIdleMs", async () => {
    let runs = 0;
    const testQuery = {
      key: getQueryKey(),
      observable: () => {
        runs++;
        return merge(
          of("test"),
          throwError(() => new Error("error")),
        );
      },
      disconnectAfterIdleMs: 10,
    } satisfies Query<string>;

    const unsubscribe = subscribeToQuery(testQuery, {});
    unsubscribe();

    expect(runs).toBe(1);

    await jest.advanceTimersByTimeAsync(5);

    const unsubscribe2 = subscribeToQuery(testQuery, {});
    unsubscribe2();

    expect(runs).toBe(1);

    await jest.advanceTimersByTimeAsync(5);

    const unsubscribe3 = subscribeToQuery(testQuery, {});
    unsubscribe3();

    expect(runs).toBe(1);

    await jest.advanceTimersByTimeAsync(5);
    unsubscribe3(); // no-op
    await jest.advanceTimersByTimeAsync(5);

    const unsubscribe4 = subscribeToQuery(testQuery, {});
    unsubscribe4();

    expect(runs).toBe(2);

    resetQuery(testQuery);
    expect(runs).toBe(2);
  });
});
