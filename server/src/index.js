const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./server");
const { ensureDefaultAdmin } = require("./services/authService");

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

ensureDefaultAdmin().catch((error) => console.error(`Auth bootstrap failed: ${error.message}`));

app.listen(PORT, HOST, () => {
  console.log(`ACET API listening on http://${HOST}:${PORT}`);
});
