const fs = require("fs-extra");
const path = require("path");
const Handlebars = require("handlebars");

const args = process.argv.slice(2);
const chainName = args[0];
const startBlock = args[1];
const template = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, "templates/subgraph.yaml")).toString()
);
const result = template({ chainName, startBlock });
fs.writeFileSync(path.join(__dirname, "subgraph.yaml"), result);
