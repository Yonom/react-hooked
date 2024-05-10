import { describe, expect, test } from "@jest/globals";

import { QueryCompletedWithoutValueError, QueryResetError } from "../errors";

describe("errors", () => {
  test("error names", () => {
    expect(new QueryResetError().name).toBe("QueryResetError");
    expect(new QueryCompletedWithoutValueError().name).toBe(
      "QueryCompletedWithoutValueError",
    );
  });
});
