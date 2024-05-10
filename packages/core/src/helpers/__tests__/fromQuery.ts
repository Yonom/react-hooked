import { describe, expect, jest, test } from "@jest/globals";
import { from } from "rxjs";

import { getQueryKey } from "../../__tests__/test-utils";
import { fromQuery } from "../fromQuery";

jest.useFakeTimers();

describe("fromQuery", () => {
  test("values", async () => {
    const values = [] as string[];
    const sub = fromQuery({
      key: getQueryKey(),
      observable: from(["test", "test2"]),
    }).subscribe((value) => values.push(value));

    expect(values).toStrictEqual(["test", "test2"]);

    sub.unsubscribe();
  });
});
