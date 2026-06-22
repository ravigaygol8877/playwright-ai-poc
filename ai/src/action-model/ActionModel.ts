export interface ActionModel {
  action: "goto" | "fill" | "click";

  target: string;

  value?: string;
}