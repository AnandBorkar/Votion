const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

async function callApi(body) {
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { status: response.status, data };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("POST /api/contact accepts a valid enquiry", async () => {
  const result = await callApi({
    name: "Asha",
    email: "asha@example.com",
    phone: "9999999999",
    message: "I want to know about delivery dates.",
  });

  assert.equal(result.status, 201);
  assert.equal(result.data.success, true);
  assert.match(result.data.message, /received/i);
});

test("POST /api/contact rejects invalid payload", async () => {
  const result = await callApi({
    name: "",
    email: "bad-email",
    message: "",
  });

  assert.equal(result.status, 400);
  assert.equal(
    result.data.message,
    "Please provide a valid name, email, and message.",
  );
});
