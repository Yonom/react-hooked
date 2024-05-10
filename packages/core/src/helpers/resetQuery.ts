import QueryStore from "../QueryStore";
import { Query } from "../types";

const resetQuery = <T>(query: Query<T>) => {
  const ref = QueryStore.get(query);
  ref?.reset(query.observable);
};

export default resetQuery;
