import { describe, expect, jest, test } from "@jest/globals";
import { Subject, delay, from } from "rxjs";

import {
  expectFullfilledResult,
  expectPendingResult,
  getQueryKey,
} from "../../__tests__/test-utils";
import { readQuery } from "../../helpers/readQuery";
import { composeQuery } from "../composeQuery";

jest.useFakeTimers();

describe("composeQuery", () => {
  test("sync scalar return", async () => {
    const query = composeQuery({
      key: getQueryKey(),
      render: async () => "test",
    });

    const result = readQuery(query);
    expectPendingResult(result);

    await jest.advanceTimersByTimeAsync(0);

    await expectFullfilledResult(result, "test");
  });

  test("multiple sync", async () => {
    const subjectQuery = {
      key: `${getQueryKey()}:subject`,
      observable: from([1, 2, 3]),
    };

    let renderCount = 0;
    const query = composeQuery({
      key: getQueryKey(),
      render: ({ read }) => {
        renderCount++;
        return read(subjectQuery);
      },
    });

    const result = readQuery(query);
    await jest.advanceTimersByTimeAsync(0);
    await expectFullfilledResult(result, 3);
    expect(renderCount).toBe(1);
  });

  test("multiple w delay", async () => {
    const innerQuery = {
      key: `${getQueryKey()}:inner`,
      observable: from([1, 2, 3]).pipe(delay(0)),
    };

    let renderCount = 0;
    const query = composeQuery({
      key: getQueryKey(),
      render: ({ read }) => {
        renderCount++;
        return read(innerQuery);
      },
      disconnectAfterIdleMs: 1,
    });

    const result = readQuery(query);
    expectPendingResult(result);

    await jest.advanceTimersByTimeAsync(0);

    await expectFullfilledResult(result, 1);
    await expectFullfilledResult(readQuery(query), 3);
    expect(renderCount).toBe(3);

    await jest.advanceTimersByTimeAsync(1);
    expectPendingResult(readQuery(query));
  });

  test("subject", async () => {
    const subject = new Subject<string>();
    const subjectQuery = {
      key: `${getQueryKey()}:subject`,
      observable: subject,
    };

    const query = composeQuery({
      key: getQueryKey(),
      render: ({ read }) => {
        return read(subjectQuery);
      },
      disconnectAfterIdleMs: 1,
    });

    const result = readQuery(query);
    expectPendingResult(result);

    subject.next("test");
    await jest.advanceTimersByTimeAsync(0);
    await expectFullfilledResult(result, "test");

    subject.next("test2");
    await jest.advanceTimersByTimeAsync(0);
    await expectFullfilledResult(readQuery(query), "test2");
  });
});

// TODO reentrancy
