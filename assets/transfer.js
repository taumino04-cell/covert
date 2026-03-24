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

  // https://base.exbitron.com/api

  try {
    const payload = {
      "operationName": "GetMarketDynamics",
      "variables": {
        "market": `${coinId}-USDT`
      },
      "query": "query GetMarketDynamics($market: String!) { marketDynamics(market: $market) { marketId startPrice lastPrice amount24h lowPrice highPrice volume24h __typename } }"
    }

    const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent('https://base.exbitron.com/api')}`;

    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const usdPrice = json?.data?.marketDynamics?.lastPrice;
    if (usdPrice === null || usdPrice === undefined) {
      throw new Error("Unable to read usd_price from response");
    }
    const rateUrl = `http://localhost:3000/proxy?url=${encodeURIComponent('https://api.exchangerate.fun/latest?base=USD&symbols=VND')}`;
    const rateResp = await fetch(rateUrl);
    if (!rateResp.ok) throw new Error(`Rate HTTP ${rateResp.status}`);
    const rateJson = await rateResp.json();
    const usdToVnd = rateJson?.rates?.VND;
    if (typeof usdToVnd !== "number") throw new Error("Unable to read VND rate");

    const total = amount * usdPrice;
    const totalVnd = total * usdToVnd;
    resultEl.textContent = `Price: $${usdPrice.toFixed(6)} | Amount: ${amount} \n* USD ${total.toFixed(6)} \n* VND ${totalVnd.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}`;
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

form.addEventListener("submit", handleSubmit);
