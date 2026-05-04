const form = document.querySelector('form');
const resultEl = document.getElementById('result');

const cryptoNames = {
  pepepow: 'PEPEW',
  ravencoin: 'RVN',
  bitcoin: 'BTC',
  ethereum: 'ETH',
  dogecoin: 'DOGE',
  litecoin: 'LTC',
  cardano: 'ADA',
  polkadot: 'DOT',
  digibyte: 'DGB',
  mazacoin: 'MAZA',
};

function getCryptoDisplayName(coinId) {
  return cryptoNames[coinId] || coinId.toUpperCase();
}

async function handleSubmit(event) {
  event.preventDefault();

  const coinId = document.querySelector('select[name="crypto"]').value;
  const amount = parseFloat(document.querySelector('input[name="amount"]').value);

  if (isNaN(amount) || amount <= 0) {
    resultEl.textContent = 'Please enter a valid amount.';
    return;
  }

  resultEl.textContent = 'Loading...';

  try {
    const coinSymbol = getCryptoDisplayName(coinId);

    // Fetch price + VND rate song song
    const [priceResp, rateResp] = await Promise.all([
      fetch('api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'GetMarketDynamics',
          variables: { market: `${coinSymbol}-USDT` },
          query: 'query GetMarketDynamics($market: String!) { marketDynamics(market: $market) { lastPrice __typename } }',
        }),
      }),
      fetch('https://open.er-api.com/v6/latest/USD'),
    ]);

    if (!priceResp.ok) throw new Error(`Proxy HTTP ${priceResp.status}`);
    if (!rateResp.ok) throw new Error(`Rate HTTP ${rateResp.status}`);

    const priceJson = await priceResp.json();
    const rateJson = await rateResp.json();

    const usdPrice = priceJson?.data?.marketDynamics?.lastPrice;
    if (usdPrice == null) throw new Error('Unable to read price from response');

    const usdToVnd = rateJson?.rates?.VND;
    if (typeof usdToVnd !== 'number') throw new Error('Unable to read VND rate');

    const totalUsd = amount * usdPrice;
    const totalVnd = totalUsd * usdToVnd;

    resultEl.textContent =
      `Price: $${usdPrice.toFixed(6)} | Amount: ${amount}\n` +
      `* USD ${totalUsd.toFixed(6)}\n` +
      `* VND ${totalVnd.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}`;

  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

form.addEventListener('submit', handleSubmit);