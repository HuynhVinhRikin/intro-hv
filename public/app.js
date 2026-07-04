const form = document.getElementById("product-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const productList = document.getElementById("product-list");
const emptyEl = document.getElementById("empty");
const messageEl = document.getElementById("message");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("search-btn");

const fields = {
  id: document.getElementById("product-id"),
  name: document.getElementById("name"),
  price: document.getElementById("price"),
  category: document.getElementById("category"),
  description: document.getElementById("description"),
};

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

function showMessage(text, type = "ok") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove("hidden");
  setTimeout(() => messageEl.classList.add("hidden"), 3000);
}

function resetForm() {
  form.reset();
  fields.id.value = "";
  formTitle.textContent = "Thêm sản phẩm";
  submitBtn.textContent = "Thêm mới";
  cancelBtn.classList.add("hidden");
}

function fillForm(product) {
  fields.id.value = product.id;
  fields.name.value = product.name;
  fields.price.value = product.price;
  fields.category.value = product.category || "";
  fields.description.value = product.description || "";
  formTitle.textContent = "Sửa sản phẩm";
  submitBtn.textContent = "Cập nhật";
  cancelBtn.classList.remove("hidden");
  fields.name.focus();
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function checkHealth() {
  try {
    const health = await api("/api/health");
    statusEl.textContent = `ES: ${health.elasticsearch}`;
    statusEl.className = "status ok";
  } catch {
    statusEl.textContent = "ES: offline";
    statusEl.className = "status error";
  }
}

function renderProducts(products) {
  productList.innerHTML = "";
  emptyEl.classList.toggle("hidden", products.length > 0);

  for (const product of products) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(product.name)}</strong>
        <div style="color:var(--muted);font-size:0.85rem;margin-top:4px">
          ${escapeHtml(product.description || "")}
        </div>
      </td>
      <td><span class="category">${escapeHtml(product.category || "general")}</span></td>
      <td class="price">${formatPrice(product.price)}</td>
      <td>${formatDate(product.updatedAt)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="edit" data-edit="${product.id}">Sửa</button>
          <button type="button" class="danger" data-delete="${product.id}">Xóa</button>
        </div>
      </td>
    `;
    productList.appendChild(tr);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadProducts(query = "") {
  const q = query ? `?q=${encodeURIComponent(query)}` : "";
  const products = await api(`/api/products${q}`);
  renderProducts(products);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: fields.name.value.trim(),
    price: Number(fields.price.value),
    category: fields.category.value.trim() || "general",
    description: fields.description.value.trim(),
  };

  try {
    if (fields.id.value) {
      await api(`/api/products/${fields.id.value}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showMessage("Đã cập nhật sản phẩm");
    } else {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("Đã thêm sản phẩm");
    }

    resetForm();
    await loadProducts(searchInput.value.trim());
  } catch (err) {
    showMessage(err.message, "error");
  }
});

cancelBtn.addEventListener("click", resetForm);

productList.addEventListener("click", async (event) => {
  const editId = event.target.getAttribute("data-edit");
  const deleteId = event.target.getAttribute("data-delete");

  if (editId) {
    try {
      const product = await api(`/api/products/${editId}`);
      fillForm(product);
    } catch (err) {
      showMessage(err.message, "error");
    }
    return;
  }

  if (deleteId) {
    if (!confirm("Xóa sản phẩm này?")) return;
    try {
      await api(`/api/products/${deleteId}`, { method: "DELETE" });
      if (fields.id.value === deleteId) resetForm();
      showMessage("Đã xóa sản phẩm");
      await loadProducts(searchInput.value.trim());
    } catch (err) {
      showMessage(err.message, "error");
    }
  }
});

searchBtn.addEventListener("click", () => {
  loadProducts(searchInput.value.trim()).catch((err) => showMessage(err.message, "error"));
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadProducts(searchInput.value.trim()).catch((err) => showMessage(err.message, "error"));
  }
});

async function init() {
  await checkHealth();
  try {
    await loadProducts();
  } catch (err) {
    showMessage(err.message, "error");
  }
}

init();
