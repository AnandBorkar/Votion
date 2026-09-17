(() => {
  const api = window.VOTION_API || "http://localhost:5000/api";
  const panel = document.createElement("aside");
  panel.className = "chat-panel";
  panel.setAttribute("aria-label", "VOTION AI assistant");
  panel.innerHTML = `<div class="chat-head"><div><strong>VOTION concierge</strong><small>STYLE, SCENT & ORDER SUPPORT</small></div><button class="chat-close" type="button" aria-label="Close chat">×</button></div><div class="chat-messages" aria-live="polite"><div class="chat-message bot">Welcome to VOTION. Ask me about watches, perfumes, shipping, returns, or your order.</div></div><div class="chat-quick"><button type="button" data-prompt="Show me watches">Watches</button><button type="button" data-prompt="Show me perfumes">Perfumes</button><button type="button" data-prompt="How does shipping work?">Shipping</button></div><form class="chat-form"><input name="message" maxlength="500" autocomplete="off" placeholder="Ask the concierge..." aria-label="Message" required><button type="submit" aria-label="Send message">Send</button></form>`;
  const launcher = document.createElement("button");
  launcher.className = "chat-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open VOTION chat");
  launcher.setAttribute("aria-expanded", "false");
  launcher.textContent = "✦";
  document.body.append(launcher, panel);
  const messages = panel.querySelector(".chat-messages");
  const form = panel.querySelector(".chat-form");
  const input = form.querySelector("input");
  const addMessage = (text, type) => {
    const message = document.createElement("div");
    message.className = `chat-message ${type}`;
    message.textContent = text;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  };
  const toggle = (open) => {
    panel.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  };
  launcher.onclick = () => toggle(!panel.classList.contains("is-open"));
  panel.querySelector(".chat-close").onclick = () => toggle(false);
  panel.querySelectorAll("[data-prompt]").forEach((button) => {
    button.onclick = () => {
      input.value = button.dataset.prompt;
      form.requestSubmit();
    };
  });
  form.onsubmit = async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    const submit = form.querySelector("button");
    submit.disabled = true;
    try {
      const response = await fetch(`${api}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Chat is unavailable");
      addMessage(data.answer, "bot");
    } catch {
      addMessage(
        "I’m having trouble connecting right now. You can still browse the collection or contact the VOTION team.",
        "bot",
      );
    } finally {
      submit.disabled = false;
      input.focus();
    }
  };
})();
