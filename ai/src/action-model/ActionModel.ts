export type TestDataKey =
  | "validUsername"
  | "invalidUsername"
  | "validPassword"
  | "invalidPassword"
  | "empty";

export interface ActionModel {
  action: "goto" | "fill" | "click";

  target: string;

  dataKey?: TestDataKey;
}