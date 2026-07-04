require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { client, ensureIndex } = require("./es");
const productsRouter = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", async (_req, res) => {
  try {
    const health = await client.cluster.health();
    res.json({
      status: "ok",
      elasticsearch: health.status,
      cluster: health.cluster_name,
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: "Elasticsearch is not available",
      detail: err.message,
    });
  }
});

app.use("/api/products", productsRouter);

async function start() {
  try {
    await client.ping();
    await ensureIndex();
    console.log("Connected to Elasticsearch");
  } catch (err) {
    console.error("Cannot connect to Elasticsearch:", err.message);
    console.error("Start ES with: npm run es:up");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
