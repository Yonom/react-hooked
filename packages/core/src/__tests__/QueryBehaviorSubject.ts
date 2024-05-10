import { describe, expect, jest, test } from "@jest/globals";
import { EMPTY, tap } from "rxjs";

import {
  expectFullfilledResult,
  expectPendingResult,
  expectRejectedResult,
} from "./test-utils";
import { QueryBehaviorSubject } from "../QueryBehaviorSubject";
import QueryResultFactory from "../QueryResultFactory";
import { COMPLETE_TOKEN, type QueryResult, RESET_TOKEN } from "../types";

describe("QueryBehaviorSubject", () => {
  const initializeResult = (subject: QueryBehaviorSubject<string>) => {
    const parent = {
      get result(): QueryResult<string> {
        return subject.result!;
      },
      subscribe: subject.addSubscriber.bind(subject),
    };
    subject.result = QueryResultFactory.pending(parent);
  };

  test("complete", async () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    const initialResult = subject.result!;
    expectPendingResult(initialResult);

    subject.complete();

    await expectRejectedResult(
      subject.result!,
      "Query completed without emitting a value",
    );
    await expectRejectedResult(
      initialResult,
      "Query completed without emitting a value",
    );

    expect(() => subject.next("test")).toThrow(
      "Cannot set value on finalized query",
    );
    expect(() => subject.error(new Error("error"))).toThrow(
      "Cannot set error on finalized query",
    );
    expect(() => subject.complete()).toThrow(
      "Cannot complete a finalized query",
    );

    subject.reset();
    subject.complete();
  });

  test("reset", () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    subject.reset();

    expect(subject.result).toBe(undefined);
  });

  test("error", async () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    const initalResult = subject.result!;
    expectPendingResult(initalResult);

    subject.error(new Error("error"));

    await expectRejectedResult(initalResult, "error");
    await expectRejectedResult(subject.result!, "error");

    expect(() => subject.next("test")).toThrow(
      "Cannot set value on finalized query",
    );
    expect(() => subject.error(new Error("error"))).toThrow(
      "Cannot set error on finalized query",
    );
    expect(() => subject.complete()).toThrow(
      "Cannot complete a finalized query",
    );

    subject.reset();
    subject.complete();
  });

  test("next->complete", async () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    const initialResult = subject.result!;
    expectPendingResult(initialResult);

    subject.next("test");

    await expectFullfilledResult(initialResult, "test");
    await expectFullfilledResult(subject.result!, "test");
    subject.next("test2");

    await expectFullfilledResult(initialResult, "test");
    await expectFullfilledResult(subject.result!, "test2");

    const secondaryResult = subject.result;

    subject.next("test2");

    expect(subject.result).toBe(secondaryResult);

    subject.complete();
    expect(subject.result).toBe(secondaryResult);

    expect(() => subject.complete()).toThrow(
      "Cannot complete a finalized query",
    );
  });

  test("subscription", async () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    let lastNotification = undefined;
    subject.addSubscriber((notification) => {
      lastNotification = notification;
    });

    subject.next("test");
    await expectFullfilledResult(lastNotification!, "test");

    subject.complete();
    expect(lastNotification).toBe(COMPLETE_TOKEN);

    subject.reset();
    expect(lastNotification).toBe(RESET_TOKEN);

    subject.error(new Error("error"));
    await expectRejectedResult(lastNotification!, "error");
  });

  test("re-enterant", async () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    const invocations = [] as [number, string][];
    subject.addSubscriber((notification) => {
      const value = (notification as QueryResult<string>).value!;
      invocations.push([1, value]);
      expect(subject.result?.value).toBe(value);

      if (value === "test") {
        subject.next("test2");
        expect(subject.result?.value).toBe("test2");
      }
    });
    subject.addSubscriber((notification) => {
      const value = (notification as QueryResult<string>).value!;
      invocations.push([2, value]);
      expect(subject.result?.value).toBe(value);
    });

    subject.next("test");

    expect(invocations).toEqual([
      [1, "test"],
      [2, "test"],
      [1, "test2"],
      [2, "test2"],
    ]);
  });

  test("catch errors in subscription", async () => {
    const subject = new QueryBehaviorSubject<string>();
    initializeResult(subject);

    let invocationCount = 0;
    subject.addSubscriber(() => {
      throw new Error();
    });
    subject.addSubscriber(() => {
      invocationCount++;
    });

    const consoleMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => jest.fn());
    subject.next("test");

    expect(consoleMock.mock.calls).toHaveLength(1);
    consoleMock.mockRestore();

    expect(invocationCount).toEqual(1);
  });

  test("connect", () => {
    const subject = new QueryBehaviorSubject<string>();
    let subCount = 0;
    const observable = EMPTY.pipe(
      tap({
        subscribe: () => {
          subCount++;
        },
      }),
    );
    initializeResult(subject);

    subject.disconnect(); // no-op
    subject.connect(observable);
    subject.connect(observable); // no-op
    subject.disconnect();
    subject.connect(observable);

    expect(subCount).toBe(2);
  });

  // TODO test reset, test subscribers
});
