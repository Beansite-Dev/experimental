export class DirectoryNotFoundError extends Error {
  constructor(message:string) {
    super(message);
    this.name="DirectoryNotFoundError";
  }
}
export class FileNotFoundError extends Error {
  constructor(message:string) {
    super(message);
    this.name="FileNotFoundError";
  }
}
export class PermissionDeniedError extends Error {
  constructor(message:string) {
    super(message);
    this.name="PermissionDeniedError";
  }
}
export class FilesystemObjectTypeError extends Error {
  constructor(message:string) {
    super(message);
    this.name="FilesystemObjectTypeError";
  }
}