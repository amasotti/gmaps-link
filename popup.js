/**
 * GMaps Link - Popup Script
 *
 * The Popup is the element loaded when the user clicks on the extension icon
 * and want to configure the extension settings.
 */

class PopupController {
    constructor() {
        this.settings = {
            openInNewTab: true,
            showConfirmation: false,
            buttonStyle: 'modern',
            customSelectors: [],
            enableOpenStreetMap: false
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
        const osmToggle = document.getElementById('osmToggle');
        const testButton = document.getElementById('testButton');
        
        // Custom selectors
        const addSelectorBtn = document.getElementById('addSelectorBtn');
        const newSelectorInput = document.getElementById('newSelectorInput');

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

        this.setupToggleEvents(osmToggle, () => {
            this.settings.enableOpenStreetMap = !this.settings.enableOpenStreetMap;
            this.updateToggle(osmToggle, this.settings.enableOpenStreetMap);
            this.saveSettings();
        });

        testButton.addEventListener('click', () => {
            this.testGoogleMapsIntegration();
        });

        // Custom selectors
        addSelectorBtn.addEventListener('click', () => {
            this.addCustomSelector();
        });
        
        newSelectorInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCustomSelector();
            }
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
        // Keyboard accessibility - allow toggling with Enter or Space
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
        const osmToggle = document.getElementById('osmToggle');

        this.updateToggle(newTabToggle, this.settings.openInNewTab);
        this.updateToggle(confirmToggle, this.settings.showConfirmation);
        this.updateToggle(osmToggle, this.settings.enableOpenStreetMap);
        this.updateCustomSelectorsList();
    }

    /**
     * Add a custom selector
     */
    addCustomSelector() {
        const input = document.getElementById('newSelectorInput');
        const selector = input.value.trim();
        
        if (!selector) return;
        
        // Validate selector
        try {
            document.querySelector(selector);
        } catch (e) {
            alert('Invalid CSS selector. Please check the syntax.');
            return;
        }
        
        // Check for duplicates
        if (this.settings.customSelectors.includes(selector)) {
            return;
        }
        
        this.settings.customSelectors.push(selector);
        this.saveSettings();
        this.updateCustomSelectorsList();
        input.value = '';
    }

    /**
     * Remove a custom selector
     */
    removeCustomSelector(selector) {
        this.settings.customSelectors = this.settings.customSelectors.filter(s => s !== selector);
        this.saveSettings();
        this.updateCustomSelectorsList();
    }

    /**
     * Update the custom selectors list display
     */
    updateCustomSelectorsList() {
        const container = document.getElementById('selectorsList');
        container.innerHTML = '';
        
        if (this.settings.customSelectors.length === 0) {
            container.innerHTML = '<div class="setting-description">No custom selectors added yet.</div>';
            return;
        }
        
        this.settings.customSelectors.forEach(selector => {
            const item = document.createElement('div');
            item.className = 'selector-item';
            item.innerHTML = `
                <span class="selector-text">${selector}</span>
                <button class="remove-selector" data-selector="${selector}">Remove</button>
            `;
            container.appendChild(item);
        });
        
        // Add event listeners for remove buttons
        container.querySelectorAll('.remove-selector').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selector = e.target.getAttribute('data-selector');
                this.removeCustomSelector(selector);
            });
        });
    }

    /**
     * Check current page status
     */
    async checkCurrentPageStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                return;
            }

            // Check if we can execute scripts on this tab
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                return;
            }

            // Execute script to check page status
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.checkPageContent
            });

        } catch (error) {
            console.error('Error checking page status:', error);
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
