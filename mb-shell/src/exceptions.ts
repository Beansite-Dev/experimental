export class InvalidLogObjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name="InvalidLogObjectError";
  }
}
export class InvalidArgumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name="InvalidArgumentsError";
  }
}
export class OperationRequiresRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name="OperationRequiresRootError";
  }
}
export class OperationRequiresRecursiveFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name="OperationRequiresRecursiveFlagError";
  }
}
