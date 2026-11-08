/** An unconfigured local target is an expected skip, not an integration outage. */
export class RioImportTargetMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RioImportTargetMissingError";
  }
}
