// LocatorFailure.ts
export interface LocatorFailure {
  failedLocator: string;
  pageName: string;
  /** Optional pre-generated alternative selectors to give AI more context. */
  alternatives?: string[];
}
