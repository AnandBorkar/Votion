const cartKey = "votion-cart",
  wishKey = "votion-wishlist";
const productCache = new Map();
const getCart = () => {
  try {
    const value = localStorage.getItem(cartKey);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};
const saveCart = (cart) => {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateCount();
};
const updateCount = () => {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    const total = getCart().reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    el.textContent = String(total);
  });
};
function addToCart(product) {
  const cart = getCart(),
    found = cart.find((item) => item._id === product._id);
  if (found) found.quantity = Number(found.quantity || 0) + 1;
  else cart.push({ ...product, quantity: 1 });
  saveCart(cart);
  toast("Added to your bag");
}
function toast(message) {
  const el = document.querySelector(".toast");
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2200);
}
function productCard(product) {
  const price = Number(product.discountPrice || product.price || 0);
  const originalPrice = Number(product.price || 0);
  return `<article class="card"><a href="product.html?id=${product._id}"><img loading="lazy" src="${product.images?.[0] || "https://placehold.co/700x850/171717/F5F1E8?text=VOTION"}" alt="${product.name}"></a><div class="card-info"><small>${product.category}</small><h3>${product.name}</h3><div class="rating">★ ${product.rating || "4.8"} <span style="color:var(--muted)">(${product.reviewCount || 0})</span></div><div class="price">₹${price.toLocaleString("en-IN")} ${product.discountPrice ? `<span class="was">₹${originalPrice.toLocaleString("en-IN")}</span>` : ""}</div><button class="add" data-product-id="${product._id}">Add to cart</button></div></article>`;
}
async function fetchProducts(query = "") {
  const key = query || "all";
  if (productCache.has(key)) return productCache.get(key);
  const res = await fetch(`${window.VOTION_API}/products${query}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();
  productCache.set(key, data);
  return data;
}
async function loadProducts(target = "products", query = "") {
  const el = document.getElementById(target);
  if (!el) return;
  try {
    const data = await fetchProducts(query);
    el.innerHTML = data.length
      ? data.map(productCard).join("")
      : '<div class="empty">No products found.</div>';
    el.querySelectorAll("[data-product-id]").forEach((btn) => {
      const product = productCache
        .get(query || "all")
        ?.find((item) => item._id === btn.dataset.productId);
      if (!product) return;
      btn.onclick = () => addToCart(product);
    });
  } catch {
    el.innerHTML =
      '<div class="empty">Network error. Start the VOTION API to load products.</div>';
  }
}
document.addEventListener("DOMContentLoaded", () => {
  updateCount();
  const menuButton = document.querySelector("[data-menu]");
  const navLinks = document.querySelector(".links");
  if (menuButton && navLinks) {
    menuButton.onclick = () => navLinks.classList.toggle("open");
  }
  Promise.all([
    loadProducts("best-sellers", "?bestSeller=true"),
    loadProducts("new-arrivals", "?newArrival=true"),
  ]);
});
