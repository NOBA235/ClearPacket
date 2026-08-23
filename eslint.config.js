const nextPlugin = require("eslint-config-next");

module.exports = [
  ...(Array.isArray(nextPlugin) ? nextPlugin : [nextPlugin]),
  {
    ignores: ["eval/results/**", ".next/**", "node_modules/**", "diagrams/**"],
  },
];
