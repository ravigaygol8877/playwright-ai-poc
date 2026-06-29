export type TestDataKey = string;

export interface ActionModel {
  action: "goto" | "fill" | "click" | "noop";

  target?: string;

  dataKey?: TestDataKey;
}