export class InvalidLogObjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name="InvalidLogObjectError";
  }
}