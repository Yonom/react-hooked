import { Observable } from "rxjs";

import { subscribeToQuery } from "./subscribeToQuery";
import { Query } from "../types";

export const fromQuery = <T>(query: Query<T>) => {
  return new Observable<T>((subscriber) => {
    return subscribeToQuery(query, subscriber);
  });
};
