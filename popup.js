/**
 * GMaps Link - Popup Script
 */

class PopupController {
    constructor() {
        this.settings = {
            openInNewTab: true,
            showConfirmation: false,
            buttonStyle: 'modern'
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.checkCurrentPageStatus();
    }

    /**
     * Load settings from Chrome storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(this.settings);
            this.settings = { ...this.settings, ...result };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    /**
     * Save settings to Chrome storage
     */
    async saveSettings() {
        try {
            await chrome.storage.sync.set(this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle switches
        const newTabToggle = document.getElementById('newTabToggle');
        const confirmToggle = document.getElementById('confirmToggle');
        const testButton = document.getElementById('testButton');

        // Handle both click and keyboard events for toggles
        this.setupToggleEvents(newTabToggle, () => {
            this.settings.openInNewTab = !this.settings.openInNewTab;
            this.updateToggle(newTabToggle, this.settings.openInNewTab);
            this.saveSettings();
        });

        this.setupToggleEvents(confirmToggle, () => {
            this.settings.showConfirmation = !this.settings.showConfirmation;
            this.updateToggle(confirmToggle, this.settings.showConfirmation);
            this.saveSettings();
        });

        testButton.addEventListener('click', () => {
            this.testGoogleMapsIntegration();
        });

        // Help and feedback links
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/amasotti/gmaps-link' });
        });
    }

    /**
     * Setup toggle button events (click and keyboard)
     */
    setupToggleEvents(toggle, callback) {
        toggle.addEventListener('click', callback);
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                callback();
            }
        });
    }

    /**
     * Update toggle switch UI and ARIA attributes
     */
    updateToggle(toggle, isActive) {
        if (isActive) {
            toggle.classList.add('active');
            toggle.setAttribute('aria-checked', 'true');
        } else {
            toggle.classList.remove('active');
            toggle.setAttribute('aria-checked', 'false');
        }
    }

    /**
     * Update UI based on current settings
     */
    updateUI() {
        const newTabToggle = document.getElementById('newTabToggle');
        const confirmToggle = document.getElementById('confirmToggle');

        this.updateToggle(newTabToggle, this.settings.openInNewTab);
        this.updateToggle(confirmToggle, this.settings.showConfirmation);
    }

    /**
     * Check current page status
     */
    async checkCurrentPageStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                this.updateStatus('query', false, 'No active tab');
                this.updateStatus('map', false, 'No active tab');
                return;
            }

            // Check if we can execute scripts on this tab
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                this.updateStatus('query', false, 'Cannot access system pages');
                this.updateStatus('map', false, 'Cannot access system pages');
                return;
            }

            // Execute script to check page status
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.checkPageContent
            });

            if (results && results[0] && results[0].result) {
                const { hasQuery, queryText, mapCount } = results[0].result;

                this.updateStatus('query', hasQuery, hasQuery ? `Found: "${queryText}"` : 'No search query found');
                this.updateStatus('map', mapCount > 0, mapCount > 0 ? `Found ${mapCount} map(s)` : 'No maps detected');
            }
        } catch (error) {
            console.error('Error checking page status:', error);
            this.updateStatus('query', false, 'Unable to check page');
            this.updateStatus('map', false, 'Unable to check page');
        }
    }

    /**
     * Function to be injected into the page to check content
     */
    checkPageContent() {
        // This function runs in the context of the web page
        const queryParams = ['q', 'query', 'search', 'term', 'location', 'place'];
        const mapSelectors = [
            '[id*="map"]',
            '[class*="map"]',
            '[data-map]',
            'iframe[src*="maps.google.com"]',
            'iframe[src*="openstreetmap"]',
            '#lu_map',
            '#dimg_1',
            '.map-container',
            '.map-wrapper',
            '.location-map'
        ];

        // Check for query parameters
        let hasQuery = false;
        let queryText = '';
        const url = new URL(window.location.href);

        for (const param of queryParams) {
            const value = url.searchParams.get(param);
            if (value) {
                hasQuery = true;
                queryText = value.length > 30 ? value.substring(0, 30) + '...' : value;
                break;
            }
        }

        // If no URL params, try page title
        if (!hasQuery) {
            const title = document.title.trim();
            if (title && title.length > 3 && title.length < 100) {
                hasQuery = true;
                queryText = title.length > 30 ? title.substring(0, 30) + '...' : title;
            }
        }

        // Count map elements
        let mapCount = 0;
        mapSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.offsetWidth > 50 && element.offsetHeight > 50) {
                        mapCount++;
                    }
                });
            } catch (error) {
                // Ignore selector errors
            }
        });

        return { hasQuery, queryText, mapCount };
    }

    /**
     * Update status indicator with ARIA support
     */
    updateStatus(type, isActive, text) {
        const statusElement = document.getElementById(`${type}Status`);
        const textElement = document.getElementById(`${type}Text`);

        if (statusElement) {
            statusElement.className = `status-icon ${isActive ? 'active' : 'inactive'}`;
            statusElement.setAttribute('aria-label', `${type} status: ${isActive ? 'active' : 'inactive'}`);
        }

        if (textElement) {
            textElement.textContent = text;
            // Announce status changes to screen readers
            if (textElement.hasAttribute('aria-live')) {
                textElement.setAttribute('aria-live', 'polite');
            }
        }
    }

    /**
     * Test Google Maps integration
     */
    async testGoogleMapsIntegration() {
        const testButton = document.getElementById('testButton');
        const successMessage = document.getElementById('successMessage');

        try {
            testButton.disabled = true;
            testButton.textContent = 'Testing...';

            // Open a test Google Maps search
            const testQuery = 'restaurants near me';
            const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(testQuery)}`;

            if (this.settings.openInNewTab) {
                await chrome.tabs.create({ url: mapsUrl });
            } else {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.update(tab.id, { url: mapsUrl });
            }

            // Show success message
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);

        } catch (error) {
            console.error('Test failed:', error);
            alert('Test failed. Please check your settings.');
        } finally {
            testButton.disabled = false;
            testButton.textContent = 'Test Google Maps Integration';
        }
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
