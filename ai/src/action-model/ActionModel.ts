export type TestDataKey =
  | "validUsername"
  | "invalidUsername"
  | "validPassword"
  | "invalidPassword"
  | "overMaxLengthUsername"
  | "uppercaseUsername"
  | "firstName"
  | "lastName"
  | "postalCode"
  | "invalidPostalCode"
  | "lockedOutUsername"
  | "empty";

export interface ActionModel {
  action: "goto" | "fill" | "click" | "noop";

  target?: string;

  dataKey?: TestDataKey;
}