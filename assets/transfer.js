// Fetch price from crypto.com price API and show amount * usd_price.
const form = document.querySelector("form");
const resultEl = document.getElementById("result");

function extractUsdPrice(data) {
  if (!data) return null;
  if (typeof data.usd_price === "number") return data.usd_price;
  if (data.data) {
    if (typeof data.data.usd_price === "number") return data.data.usd_price;
    if (data.data.price && typeof data.data.price.usd_price === "number") return data.data.price.usd_price;
    if (typeof data.data === "number") return data.data;
  }
  return null;
}

async function handleSubmit(event) {
  event.preventDefault();
  const coinId = document.querySelector('select[name="crypto"]').value;
  const amount = parseFloat(document.querySelector('input[name="amount"]').value || "0");
  resultEl.textContent = "Loading...";

  try {
    const resp = await fetch(`https://price-api.crypto.com/price/v1/token-price/${coinId}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const usdPrice = extractUsdPrice(json);
    if (usdPrice === null) {
      throw new Error("Unable to read usd_price from response");
    }
    const total = amount * usdPrice;
    resultEl.textContent = `Price: $${usdPrice.toFixed(6)} | Amount: ${amount} => USD ${total.toFixed(6)}`;
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

form.addEventListener("submit", handleSubmit);
