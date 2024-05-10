import { describe, expect, jest, test } from "@jest/globals";
import { from, of } from "rxjs";

import {
  expectFullfilledResult,
  getQueryKey,
} from "../../__tests__/test-utils";
import { Query } from "../../types";
import readQuery from "../readQuery";

const testQuery = (name: string) =>
  ({
    key: getQueryKey() + " " + name,
    observable: of("test"),
  }) satisfies Query<string>;

jest.useFakeTimers();

describe("readQuery", () => {
  test("read from multiple sync value", async () => {
    const value = await readQuery({
      key: getQueryKey() + " sync",
      observable: from([1, 2, 3]),
    });

    expect(value).toBe(3);
  });

  test("read value", async () => {
    const result = readQuery(testQuery("read"));

    await expectFullfilledResult(result, "test");
  });

  test("retain with disconnectAfterIdleMs", async () => {
    const longLasting = {
      ...testQuery("long-lasting"),
      disconnectAfterIdleMs: 10,
    };

    // warm up, the first result is pending
    readQuery(longLasting);

    const result = readQuery(longLasting);

    await jest.advanceTimersByTimeAsync(5);

    const result2 = readQuery(longLasting);

    expect(result).toBe(result2);

    await jest.advanceTimersByTimeAsync(5);

    const result3 = readQuery(longLasting);

    expect(result).toBe(result3);

    await jest.advanceTimersByTimeAsync(10);

    const result4 = readQuery(longLasting);

    expect(result).not.toBe(result4);
  });
});
