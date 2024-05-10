import QueryStore from "../QueryStore";
import { runReadEffects } from "../queryEffects";
import type { Query } from "../types";

const readQuery = <T>(query: Query<T>) => {
  const ref = QueryStore.getOrCreate(query);
  runReadEffects(query, ref);
  return ref.result;
};

export default readQuery;
