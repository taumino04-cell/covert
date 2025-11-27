/**
 * Cryptocurrency Converter Application
 * A modern crypto conversion tool with real-time price fetching
 */

class CryptoConverter {
    constructor() {
        this.cryptoNames = {
            'pepepow': 'PEPEW',
            'ravencoin': 'RVN',
            'bitcoin': 'BTC',
            'ethereum': 'ETH',
            'dogecoin': 'DOGE',
            'litecoin': 'LTC',
            'cardano': 'ADA',
            'polkadot': 'DOT',
            'digibyte': 'DGB',
        };
        
        this.elements = {};
        this.isConverting = false;
        
        // Price cache with 1-minute expiration
        this.priceCache = new Map();
        this.cacheExpiration = 60 * 1000; // 1 minute in milliseconds
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateAmountLabel();
        this.updatePrices();
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            fromCrypto: document.getElementById('from-crypto'),
            toCrypto: document.getElementById('to-crypto'),
            amountInput: document.getElementById('crypto-amount'),
            amountLabel: document.getElementById('amount-label'),
            fromPrice: document.getElementById('from-price'),
            toPrice: document.getElementById('to-price'),
            convertBtn: document.getElementById('convert-btn'),
            convertText: document.getElementById('convert-text'),
            convertLoading: document.getElementById('convert-loading'),
            result: document.getElementById('result'),
            error: document.getElementById('error')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.elements.fromCrypto.addEventListener('change', () => {
            this.updateAmountLabel();
            this.updatePrices();
        });
        
        this.elements.toCrypto.addEventListener('change', () => {
            this.updatePrices();
        });

        // Allow Enter key to trigger conversion
        this.elements.amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.convert();
            }
        });
    }

    /**
     * Check if cached price is still valid
     * @param {string} coinId - The CoinGecko ID of the cryptocurrency
     * @returns {number|null} Cached price if valid, null if expired or not found
     */
    getCachedPrice(coinId) {
        const cached = this.priceCache.get(coinId);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > this.cacheExpiration) {
            this.priceCache.delete(coinId);
            return null;
        }
        
        return cached.price;
    }

    /**
     * Cache price data
     * @param {string} coinId - The CoinGecko ID of the cryptocurrency
     * @param {number} price - The price to cache
     */
    setCachedPrice(coinId, price) {
        this.priceCache.set(coinId, {
            price: price,
            timestamp: Date.now()
        });
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [coinId, cached] of this.priceCache) {
            if (now - cached.timestamp > this.cacheExpiration) {
                this.priceCache.delete(coinId);
            }
        }
    }

    /**
     * Get cache status for display
     * @param {string} coinId - The CoinGecko ID of the cryptocurrency
     * @returns {string} Cache status indicator
     */
    getCacheStatus(coinId) {
        const cached = this.priceCache.get(coinId);
        if (!cached) return '';
        
        const now = Date.now();
        const ageInSeconds = Math.floor((now - cached.timestamp) / 1000);
        const remainingSeconds = 60 - ageInSeconds;
        
        if (remainingSeconds > 0) {
            return ` <span class="text-xs text-blue-500">(cached ${remainingSeconds}s)</span>`;
        }
        return '';
    }

    /**
     * Fetch cryptocurrency price from CoinGecko API with caching
     * @param {string} coinId - The CoinGecko ID of the cryptocurrency
     * @returns {Promise<number>} The current price in USD
     */
    async fetchPrice(coinId) {
        // Check cache first
        const cachedPrice = this.getCachedPrice(coinId);
        if (cachedPrice !== null) {
            console.log(`Using cached price for ${coinId}: $${cachedPrice}`);
            return cachedPrice;
        }

        try {
            console.log(`Fetching fresh price for ${coinId}...`);
            // https://price-api.crypto.com/price/v1/token-price/ravencoin
            // https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ravencoin

            const response = await fetch(
                `https://price-api.crypto.com/price/v1/token-price/${coinId}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // if (data.length > 0 && data[0].current_price !== null) {
            //     const price = data[0].current_price;
            //     this.setCachedPrice(coinId, price);
            //     return price;
            // } else {
            //     throw new Error(`No price data found for ${coinId}`);
            // }
            this.setCachedPrice(coinId, data.usd_price);
            return data.usd_price;
        } catch (error) {
            console.error(`Error fetching price for ${coinId}:`, error);
            throw error;
        }
    }

    /**
     * Get display name for cryptocurrency
     * @param {string} coinId - The CoinGecko ID
     * @returns {string} Display name
     */
    getCryptoDisplayName(coinId) {
        return this.cryptoNames[coinId] || coinId.toUpperCase();
    }

    /**
     * Format price with appropriate decimal places
     * @param {number} price - Price to format
     * @returns {string} Formatted price string
     */
    formatPrice(price) {
        const options = {
            style: 'currency',
            currency: 'USD'
        };

        if (price >= 1) {
            options.minimumFractionDigits = 2;
            options.maximumFractionDigits = 6;
        } else {
            options.minimumFractionDigits = 6;
            options.maximumFractionDigits = 10;
        }

        return price.toLocaleString('en-US', options);
    }

    /**
     * Update the amount input label
     */
    updateAmountLabel() {
        const fromCrypto = this.elements.fromCrypto.value;
        const cryptoName = this.getCryptoDisplayName(fromCrypto);
        this.elements.amountLabel.textContent = `Enter ${cryptoName} Amount:`;
    }

    /**
     * Update price displays for both cryptocurrencies
     */
    async updatePrices() {
        const fromCrypto = this.elements.fromCrypto.value;
        const toCrypto = this.elements.toCrypto.value;

        // Clear expired cache entries
        this.clearExpiredCache();

        // Show loading state
        this.elements.fromPrice.innerHTML = '<span class="text-gray-400">Loading...</span>';
        this.elements.toPrice.innerHTML = '<span class="text-gray-400">Loading...</span>';

        try {
            const [fromPrice, toPrice] = await Promise.all([
                this.fetchPrice(fromCrypto),
                this.fetchPrice(toCrypto)
            ]);

            const fromName = this.getCryptoDisplayName(fromCrypto);
            const toName = this.getCryptoDisplayName(toCrypto);

            // Add cache status indicators
            const fromCacheStatus = this.getCacheStatus(fromCrypto);
            const toCacheStatus = this.getCacheStatus(toCrypto);

            this.elements.fromPrice.innerHTML = 
                `<span class="font-medium">${fromName}:</span> ${this.formatPrice(fromPrice)}${fromCacheStatus}`;
            this.elements.toPrice.innerHTML = 
                `<span class="font-medium">${toName}:</span> ${this.formatPrice(toPrice)}${toCacheStatus}`;
        } catch (error) {
            this.elements.fromPrice.innerHTML = '<span class="text-red-500">Price unavailable</span>';
            this.elements.toPrice.innerHTML = '<span class="text-red-500">Price unavailable</span>';
        }
    }

    /**
     * Set loading state for convert button
     * @param {boolean} isLoading - Whether to show loading state
     */
    setLoadingState(isLoading) {
        this.isConverting = isLoading;
        this.elements.convertBtn.disabled = isLoading;
        
        if (isLoading) {
            this.elements.convertText.classList.add('hidden');
            this.elements.convertLoading.classList.remove('hidden');
        } else {
            this.elements.convertText.classList.remove('hidden');
            this.elements.convertLoading.classList.add('hidden');
        }
    }

    /**
     * Clear previous results and error messages
     */
    clearMessages() {
        this.elements.result.textContent = '';
        this.elements.error.textContent = '';
        this.elements.result.classList.add('hidden');
        this.elements.error.classList.add('hidden');
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    /**
     * Show conversion result
     * @param {string} message - Result message to display
     */
    showResult(message) {
        this.elements.result.textContent = message;
        this.elements.result.classList.remove('hidden');
    }

    /**
     * Validate conversion inputs
     * @returns {Object} Validation result with isValid flag and error message
     */
    validateInputs() {
        const amount = parseFloat(this.elements.amountInput.value);
        const fromCrypto = this.elements.fromCrypto.value;
        const toCrypto = this.elements.toCrypto.value;

        if (fromCrypto === toCrypto) {
            return {
                isValid: false,
                error: 'Please select different cryptocurrencies for conversion.'
            };
        }

        if (isNaN(amount) || amount <= 0) {
            const fromName = this.getCryptoDisplayName(fromCrypto);
            return {
                isValid: false,
                error: `Please enter a valid ${fromName} amount.`
            };
        }

        return { isValid: true, amount, fromCrypto, toCrypto };
    }

    /**
     * Perform cryptocurrency conversion
     */
    async convert() {
        if (this.isConverting) return;

        this.clearMessages();
        this.setLoadingState(true);

        try {
            const validation = this.validateInputs();
            
            if (!validation.isValid) {
                this.showError(validation.error);
                return;
            }

            const { amount, fromCrypto, toCrypto } = validation;

            // Fetch prices for both cryptocurrencies
            const [fromPrice, toPrice] = await Promise.all([
                this.fetchPrice(fromCrypto),
                this.fetchPrice(toCrypto)
            ]);

            // Calculate conversion: FROM -> USD -> TO
            const usdAmount = amount * fromPrice;
            const convertedAmount = usdAmount / toPrice;

            // Get display names
            const fromName = this.getCryptoDisplayName(fromCrypto);
            const toName = this.getCryptoDisplayName(toCrypto);

            // Format and display result
            const resultMessage = 
                `${amount.toFixed(4)} ${fromName} = ${convertedAmount.toFixed(8)} ${toName} ` +
                `(via USD: $${usdAmount.toFixed(6)})`;
            
            this.showResult(resultMessage);

        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Error fetching prices. Please try again later.');
        } finally {
            this.setLoadingState(false);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const converter = new CryptoConverter();
    
    // Make convert function globally available for onclick handler
    window.convert = () => converter.convert();
});