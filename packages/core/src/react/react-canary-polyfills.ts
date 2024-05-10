import * as React from "react";

import { QueryResult } from "../types";

const polyfill_use = <T>(promise: QueryResult<T>): T => {
  switch (promise.status) {
    case "rejected":
      throw promise.reason;
    case "fulfilled":
      return promise.value;

    default:
      throw promise;
  }
};

export const use = (React as { use?: typeof polyfill_use }).use ?? polyfill_use;
