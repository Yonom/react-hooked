import { expect } from "@jest/globals";

import { QueryResult } from "../types";

export const expectPendingResult = <T>(result: QueryResult<T>) => {
  expect(result.status).toBe("pending");
};

export const expectFullfilledResult = async <T>(
  result: QueryResult<T>,
  value: T,
) => {
  expect(result.status).toBe("fulfilled");
  if (result.status === "fulfilled") {
    expect(result.value).toBe(value);
  }

  expect(await result).toBe(value);
};

export const expectRejectedResult = async <T>(
  result: QueryResult<T>,
  message: string,
) => {
  expect(result.status).toBe("rejected");
  if (result.status === "rejected") {
    expect(result.reason).toHaveProperty("message", message);
  }

  await expect(result).rejects.toThrow(message);
};

export const getQueryKey = () => {
  const name = expect.getState().currentTestName;
  if (!name) throw new Error("No test name");
  return name;
};
