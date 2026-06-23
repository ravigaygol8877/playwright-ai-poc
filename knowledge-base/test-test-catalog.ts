import { TestCatalogService }
from "./TestCatalogService.js";

const service =
  new TestCatalogService();

const suites =
  service.load();

console.log(suites);