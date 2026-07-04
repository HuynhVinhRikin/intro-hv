const { Client } = require("@elastic/elasticsearch");

const INDEX = process.env.ELASTICSEARCH_INDEX || "products";

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
});

async function ensureIndex() {
  const exists = await client.indices.exists({ index: INDEX });
  if (exists) return;

  await client.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        name: { type: "text", fields: { keyword: { type: "keyword" } } },
        description: { type: "text" },
        price: { type: "float" },
        category: { type: "keyword" },
        createdAt: { type: "date" },
        updatedAt: { type: "date" },
      },
    },
  });
}

function toProduct(hit) {
  return { id: hit._id, ...hit._source };
}

async function listProducts(query = "") {
  const q = query.trim();
  const result = await client.search({
    index: INDEX,
    size: 100,
    sort: [{ createdAt: { order: "desc" } }],
    query: q
      ? {
          multi_match: {
            query: q,
            fields: ["name", "description", "category"],
            fuzziness: "AUTO",
          },
        }
      : { match_all: {} },
  });

  return result.hits.hits.map(toProduct);
}

async function getProduct(id) {
  try {
    const result = await client.get({ index: INDEX, id });
    return toProduct(result);
  } catch (err) {
    if (err.meta?.statusCode === 404) return null;
    throw err;
  }
}

async function createProduct(data) {
  const now = new Date().toISOString();
  const doc = {
    name: data.name,
    description: data.description || "",
    price: Number(data.price),
    category: data.category || "general",
    createdAt: now,
    updatedAt: now,
  };

  const result = await client.index({
    index: INDEX,
    document: doc,
    refresh: true,
  });

  return { id: result._id, ...doc };
}

async function updateProduct(id, data) {
  const existing = await getProduct(id);
  if (!existing) return null;

  const doc = {
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    price: data.price !== undefined ? Number(data.price) : existing.price,
    category: data.category ?? existing.category,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await client.index({
    index: INDEX,
    id,
    document: doc,
    refresh: true,
  });

  return { id, ...doc };
}

async function deleteProduct(id) {
  try {
    await client.delete({ index: INDEX, id, refresh: true });
    return true;
  } catch (err) {
    if (err.meta?.statusCode === 404) return false;
    throw err;
  }
}

module.exports = {
  client,
  ensureIndex,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
