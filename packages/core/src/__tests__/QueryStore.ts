import { describe, expect, jest, test } from "@jest/globals";
import { from, of } from "rxjs";

import { expectFullfilledResult, getQueryKey } from "./test-utils";
import QueryStore from "../QueryStore";
import type { Query, QueryResult } from "../types";

jest.useFakeTimers();

describe("QueryStore", () => {
  test("observable as function", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: () => of("test"),
    } satisfies Query<string>;

    const ref = QueryStore.getOrCreate(testQuery);

    await expectFullfilledResult(ref.result, "test");
  });

  test("get", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
    } satisfies Query<string>;

    const get1 = QueryStore.get(testQuery);
    expect(get1).toBe(undefined);

    QueryStore.getOrCreate(testQuery);

    const get2 = QueryStore.get(testQuery);

    await expectFullfilledResult(get2!.result, "test");
  });

  test("with setup", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: from([1, 2]),
    } satisfies Query<number>;

    let result: QueryResult<number> | undefined;
    QueryStore.getOrCreate(testQuery, (ref) => {
      result = ref.result;
    });

    await expectFullfilledResult(result!, 1);

    QueryStore.getOrCreate(testQuery, (ref) => {
      result = ref.result;
    });

    await expectFullfilledResult(result!, 2);
  });

  test("getOrCreate returns same reference", async () => {
    const testQuery = {
      key: getQueryKey(),
      observable: of("test"),
    } satisfies Query<string>;

    const ref = QueryStore.getOrCreate(testQuery);

    await expectFullfilledResult(ref.result, "test");

    const ref2 = QueryStore.getOrCreate(testQuery);
    expect(ref).toBe(ref2);

    await jest.advanceTimersByTimeAsync(0);
    expect(ref.isDisposed).toBe(true);

    const ref3 = QueryStore.getOrCreate(testQuery);
    expect(ref).not.toBe(ref3);
  });
});
