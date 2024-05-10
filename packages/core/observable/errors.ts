export class QueryResetError extends Error {
  constructor() {
    super("Query was reset");
    this.name = "QueryResetError";
  }
}

export class QueryCompletedWithoutValueError extends Error {
  constructor() {
    super("Query completed without emitting a value");
    this.name = "QueryCompletedWithoutValueError";
  }
}
