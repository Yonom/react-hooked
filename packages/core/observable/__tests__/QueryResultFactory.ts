import { describe, expect, test } from "@jest/globals";

import {
  expectPendingResult,
  expectFullfilledResult,
  expectRejectedResult,
} from "./test-utils";
import QueryResultFactory from "../QueryResultFactory";
import {
  COMPLETE_TOKEN,
  QueryNotification,
  QuerySubscriber,
  RESET_TOKEN,
} from "../types";

const getPendingResult = () => {
  let callback = (_res: QueryNotification<string>) => {};
  const mockRef = {
    subscribers: 0,
    subscribe: (cb: QuerySubscriber<string>) => {
      callback = cb;
      mockRef.subscribers++;
      return () => {
        mockRef.subscribers--;
      };
    },
  };

  const result = QueryResultFactory.pending(mockRef);
  expectPendingResult(result);

  const getSubscribers = () => mockRef.subscribers;
  expect(getSubscribers()).toBe(1);

  return { result, getSubscribers, callback };
};

describe("QueryResultFactory", () => {
  test("pending -> fulfilled", async () => {
    const { result, getSubscribers, callback } = getPendingResult();

    callback(QueryResultFactory.fulfill("value"));

    await expectFullfilledResult(result, "value");
    expect(getSubscribers()).toBe(0);
  });

  test("pending -> rejected", async () => {
    const { result, getSubscribers, callback } = getPendingResult();

    callback(QueryResultFactory.reject(new Error("error")));

    await expectRejectedResult(result, "error");
    expect(getSubscribers()).toBe(0);
  });

  test("pending -> complete", async () => {
    const { result, getSubscribers, callback } = getPendingResult();

    callback(COMPLETE_TOKEN);

    await expectRejectedResult(
      result,
      "Query completed without emitting a value",
    );
    expect(getSubscribers()).toBe(0);
  });

  test("pending -> reset", async () => {
    const { result, getSubscribers, callback } = getPendingResult();

    callback(RESET_TOKEN);

    await expectRejectedResult(result, "Query was reset");
    expect(getSubscribers()).toBe(0);
  });

  test("pending -> pending", async () => {
    const { result, getSubscribers, callback } = getPendingResult();

    expect(() => callback(result)).toThrow("Unexpected state");
    expect(getSubscribers()).toBe(0);
  });

  test("rejected", async () => {
    const result = QueryResultFactory.reject(new Error("error"));

    await expectRejectedResult(result, "error");
  });

  test("fulfilled", async () => {
    const result = QueryResultFactory.fulfill("value");

    await expectFullfilledResult(result, "value");
  });
});
