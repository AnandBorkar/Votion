const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const adminDir = path.join(__dirname, "../../frontend/admin");

for (const page of ["add-product.html", "edit-product.html", "products.html"]) {
  test(`${page} loads the API config before the admin script`, () => {
    const html = fs.readFileSync(path.join(adminDir, page), "utf8");
    assert.match(html, /<script src="\.\.\/js\/config\.js"><\/script>/);
    assert.match(html, /<script src="\.\.\/js\/admin\.js/);
    assert.ok(
      html.indexOf('<script src="../js/config.js"></script>') <
        html.indexOf('<script src="../js/admin.js'),
      "API config must be loaded before the admin script",
    );
  });
}

test("edit-product.html does not show a category selector", () => {
  const html = fs.readFileSync(
    path.join(adminDir, "edit-product.html"),
    "utf8",
  );
  assert.doesNotMatch(html, /name="category"/i);
  assert.doesNotMatch(html, /id="categorySelect"/i);
});
