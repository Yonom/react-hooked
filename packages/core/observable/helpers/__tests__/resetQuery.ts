import { describe, expect, test } from "@jest/globals";
// import failOnConsole from "jest-fail-on-console";
import { of, throwError } from "rxjs";

import {
  expectFullfilledResult,
  expectRejectedResult,
  getQueryKey,
} from "../../__tests__/test-utils";
import readQuery from "../readQuery";
import resetQuery from "../resetQuery";
import { subscribeToQuery } from "../subscribeToQuery";

// TODO fix this
// ensure throws inside subscribeToQuery get caught
// failOnConsole();

describe("resetQuery", () => {
  test("reset uninitialized", () => {
    let subbed = false;
    const test = {
      key: getQueryKey(),
      observable: () => {
        subbed = true;
        throw new Error("error");
      },
    };

    // should not initialize query
    resetQuery(test);

    expect(subbed).toBe(false);
  });

  test("reset to replace observable", async () => {
    const throwingQuery = {
      key: getQueryKey(),
      observable: throwError(() => new Error("error")),
    };
    const fulfillingQuery = {
      key: getQueryKey(),
      observable: of("test"),
    };

    subscribeToQuery(throwingQuery, {});

    await expectRejectedResult(readQuery(fulfillingQuery), "error");

    resetQuery(fulfillingQuery);

    await expectFullfilledResult(readQuery(throwingQuery), "test");
  });
});
