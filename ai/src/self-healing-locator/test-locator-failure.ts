// test-locator-failure.ts
import type { LocatorFailure }
from "./LocatorFailure.js";

const failure: LocatorFailure = {
  failedLocator: "#loginBtn",
  pageName: "login-page"
};

console.log(failure);