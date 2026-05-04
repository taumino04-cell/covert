class CryptoConverter {
    constructor() {
        this.cryptoNames = {
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

        this.elements = {};
        this.isConverting = false;
        this.priceCache = new Map();
        this.cacheExpiration = 60 * 1000;

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateAmountLabel();
        this.updatePrices();
    }

    cacheElements() {
        this.elements = {
            fromCrypto: document.getElementById('from-crypto'),
            toCrypto: document.getElementById('to-crypto'),
            amountInput: document.getElementById('crypto-amount'),
            amountLabel: document.getElementById('amount-label'),
            fromPrice: document.getElementById('from-price'),
            toPrice: document.getElementById('to-price'),
            convertBtn: document.getElementById('convert-btn'),
            result: document.getElementById('result'),
            error: document.getElementById('error'),
        };
    }

    bindEvents() {
        this.elements.fromCrypto.addEventListener('change', () => {
            this.updateAmountLabel();
            this.updatePrices();
        });

        this.elements.toCrypto.addEventListener('change', () => {
            this.updatePrices();
        });

        this.elements.amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.convert();
        });
    }

    // ── Cache ──────────────────────────────────────────────

    getCachedPrice(coinId) {
        const cached = this.priceCache.get(coinId);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.cacheExpiration) {
            this.priceCache.delete(coinId);
            return null;
        }
        return cached.price;
    }

    setCachedPrice(coinId, price) {
        this.priceCache.set(coinId, { price, timestamp: Date.now() });
    }

    clearExpiredCache() {
        const now = Date.now();
        for (const [coinId, cached] of this.priceCache) {
            if (now - cached.timestamp > this.cacheExpiration) {
                this.priceCache.delete(coinId);
            }
        }
    }

    getCacheStatus(coinId) {
        const cached = this.priceCache.get(coinId);
        if (!cached) return '';
        const remaining = 60 - Math.floor((Date.now() - cached.timestamp) / 1000);
        return remaining > 0
            ? ` <span class="text-xs text-blue-500">(cached ${remaining}s)</span>`
            : '';
    }

    // ── API ───────────────────────────────────────────────

    async fetchPrice(coinId) {
        const cachedPrice = this.getCachedPrice(coinId);
        if (cachedPrice !== null) return cachedPrice;

        const payload = {
            operationName: 'GetMarketDynamics',
            variables: { market: `${this.getCryptoDisplayName(coinId)}-USDT` },
            query: 'query GetMarketDynamics($market: String!) { marketDynamics(market: $market) { lastPrice __typename } }',
        };

        const response = await fetch('api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const json = await response.json();
        const price = json?.data?.marketDynamics?.lastPrice;
        if (!price) throw new Error(`No price data for ${coinId}`);

        this.setCachedPrice(coinId, price);
        return price;
    }

    async fetchVndRate() {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error(`Rate HTTP error: ${response.status}`);
        const json = await response.json();
        const rate = json?.rates?.VND;
        if (typeof rate !== 'number') throw new Error('Unable to read VND rate');
        return rate;
    }

    // ── Helpers ───────────────────────────────────────────

    getCryptoDisplayName(coinId) {
        return this.cryptoNames[coinId] || coinId.toUpperCase();
    }

    formatPrice(price) {
        const options = {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: price >= 1 ? 2 : 6,
            maximumFractionDigits: price >= 1 ? 6 : 10,
        };
        return price.toLocaleString('en-US', options);
    }

    randomDelay(min = 1000, max = 2000) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    triggerDelay() {
        return new Promise(resolve => setTimeout(resolve, this.randomDelay()));
    }

    // ── UI ────────────────────────────────────────────────

    updateAmountLabel() {
        const name = this.getCryptoDisplayName(this.elements.fromCrypto.value);
        this.elements.amountLabel.textContent = `Enter ${name} Amount:`;
    }

    async updatePrices() {
        this.clearExpiredCache();
        this.elements.fromPrice.innerHTML = '<span class="text-gray-400">Loading...</span>';
        this.elements.toPrice.innerHTML = '<span class="text-gray-400">Loading...</span>';

        const fromCrypto = this.elements.fromCrypto.value;
        const toCrypto = this.elements.toCrypto.value;

        try {
            const [fromPrice, toPrice] = await Promise.all([
                this.fetchPrice(fromCrypto),
                this.fetchPrice(toCrypto),
            ]);

            const fromName = this.getCryptoDisplayName(fromCrypto);
            const toName = this.getCryptoDisplayName(toCrypto);

            this.elements.fromPrice.innerHTML =
                `<span class="font-medium">${fromName}:</span> ${this.formatPrice(fromPrice)}${this.getCacheStatus(fromCrypto)}`;
            this.elements.toPrice.innerHTML =
                `<span class="font-medium">${toName}:</span> ${this.formatPrice(toPrice)}${this.getCacheStatus(toCrypto)}`;
        } catch {
            this.elements.fromPrice.innerHTML = '<span class="text-red-500">Price unavailable</span>';
            this.elements.toPrice.innerHTML = '<span class="text-red-500">Price unavailable</span>';
        }
    }

    setLoadingState(isLoading) {
        this.isConverting = isLoading;
        this.elements.convertBtn.disabled = isLoading;
    }

    clearMessages() {
        this.elements.result.textContent = '';
        this.elements.error.textContent = '';
        this.elements.result.classList.add('hidden');
        this.elements.error.classList.add('hidden');
    }

    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    showResult(message) {
        this.elements.result.textContent = message;
        this.elements.result.classList.remove('hidden');
    }

    validateInputs() {
        const fromCrypto = this.elements.fromCrypto.value;
        const toCrypto = this.elements.toCrypto.value;
        const amount = parseFloat(this.elements.amountInput.value);

        if (fromCrypto === toCrypto) {
            return { isValid: false, error: 'Please select different cryptocurrencies.' };
        }
        if (isNaN(amount) || amount <= 0) {
            return { isValid: false, error: `Please enter a valid ${this.getCryptoDisplayName(fromCrypto)} amount.` };
        }
        return { isValid: true, amount, fromCrypto, toCrypto };
    }

    // ── Convert ───────────────────────────────────────────

    async convert() {
        if (this.isConverting) return;

        this.clearMessages();
        this.setLoadingState(true);
        this.showResult('Loading...');

        try {
            const validation = this.validateInputs();
            if (!validation.isValid) {
                this.showError(validation.error);
                return;
            }

            const { amount, fromCrypto, toCrypto } = validation;

            const [fromPrice, toPrice, usdToVnd] = await Promise.all([
                this.fetchPrice(fromCrypto),
                this.fetchPrice(toCrypto),
                this.fetchVndRate(),
            ]);

            const totalUsd = amount * fromPrice;
            const converted = totalUsd / toPrice;
            const totalVnd = totalUsd * usdToVnd;

            const fromName = this.getCryptoDisplayName(fromCrypto);
            const toName = this.getCryptoDisplayName(toCrypto);

            await this.triggerDelay();

            this.showResult(
                `${amount.toFixed(4)} ${fromName} = ${converted.toFixed(8)} ${toName}\n` +
                `* USD ${totalUsd.toFixed(6)}\n` +
                `* VND ${totalVnd.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}`
            );
        } catch (error) {
            this.showError('Error fetching prices. Please try again later.');
        } finally {
            this.setLoadingState(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const converter = new CryptoConverter();
    window.convert = () => converter.convert();
});