import { PlaywrightRenderer }
from "./PlaywrightRenderer.js";

const renderer =
  new PlaywrightRenderer();

const knowledgeBase = {
  url: "https://example.com/login",

  selectors: {
    username: "#username",
    password: "#password",
    loginButton: "#login"
  }
};

const result =
  renderer.renderAction(
    {
      action: "fill",
      target: "username",
      dataKey: "validUsername"
    },
    knowledgeBase
  );

console.log(result);