import { KnowledgeBaseService }
from "./KnowledgeBaseService.js";

const kb =
  new KnowledgeBaseService();

const page =
  kb.load("login-page");

console.log(page);