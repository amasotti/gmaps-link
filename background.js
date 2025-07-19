/**
 * GMaps Link - Background Script
 * Handles keyboard shortcuts and extension events
 */

class BackgroundController {
    constructor() {
        this.queryParams = ['q', 'query', 'search', 'term', 'location', 'place'];
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for extension events
     */
    setupEventListeners() {
        // Handle keyboard commands
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    async handleCommand(command) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || this.isRestrictedUrl(tab.url)) {
                console.log('Cannot execute command on this page');
                return;
            }

            const query = await this.getPageQuery(tab);
            
            if (!query) {
                this.showNotification('No location found', 'Could not detect a location or search query on this page.');
                return;
            }

            if (command === 'open-maps') {
                await this.openGoogleMaps(query);
                this.showNotification('Opening Google Maps', `Searching for: ${query}`);
            }
        } catch (error) {
            console.error('Error handling command:', error);
            this.showNotification('Error', 'Failed to execute command. Please try again.');
        }
    }

    /**
     * Check if URL is restricted (can't inject scripts)
     */
    isRestrictedUrl(url) {
        return url.startsWith('chrome://') || 
               url.startsWith('chrome-extension://') || 
               url.startsWith('edge://') || 
               url.startsWith('about:') ||
               url.startsWith('moz-extension://');
    }

    /**
     * Get search query from page
     */
    async getPageQuery(tab) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.extractPageQuery,
                args: [this.queryParams]
            });

            return results && results[0] && results[0].result ? results[0].result : null;
        } catch (error) {
            console.error('Error extracting page query:', error);
            return null;
        }
    }

    /**
     * Function injected into page to extract query
     */
    extractPageQuery(queryParams) {
        // Try URL parameters first
        const url = new URL(window.location.href);
        for (const param of queryParams) {
            const value = url.searchParams.get(param);
            if (value && value.trim().length > 0) {
                return value.trim();
            }
        }

        // Try page title
        const title = document.title.trim();
        if (title && title.length > 3 && title.length < 100) {
            return title;
        }

        // Try meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc?.content && metaDesc.content.trim().length > 0) {
            return metaDesc.content.trim();
        }

        // Try first heading
        const heading = document.querySelector('h1, h2, h3');
        if (heading?.textContent && heading.textContent.trim().length > 3) {
            const text = heading.textContent.trim();
            if (text.length < 100) {
                return text;
            }
        }

        return null;
    }

    /**
     * Open Google Maps with query
     */
    async openGoogleMaps(query) {
        const encodedQuery = encodeURIComponent(query);
        const mapsUrl = `https://www.google.com/maps/search/${encodedQuery}`;
        
        // Get user settings
        const settings = await this.getSettings();
        
        if (settings.openInNewTab !== false) {
            await chrome.tabs.create({ url: mapsUrl });
        } else {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.update(tab.id, { url: mapsUrl });
        }
    }


    /**
     * Get user settings
     */
    async getSettings() {
        try {
            const defaultSettings = {
                openInNewTab: true,
                showConfirmation: false,
                buttonStyle: 'modern'
            };
            const result = await chrome.storage.sync.get(defaultSettings);
            return { ...defaultSettings, ...result };
        } catch (error) {
            console.error('Error loading settings:', error);
            return {
                openInNewTab: true,
                showConfirmation: false,
                buttonStyle: 'modern'
            };
        }
    }

    /**
     * Show notification to user
     */
    showNotification(title, message) {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: title,
                message: message,
                silent: true
            });
        }
    }

    /**
     * Handle extension installation and updates
     */
    handleInstallation(details) {
        if (details.reason === 'install') {
            console.log('GMaps Link installed');
            
            // Show welcome notification
            this.showNotification(
                'GMaps Link Installed',
                'Use Ctrl+Shift+M (Cmd+Shift+M on Mac) to quickly open locations in Google Maps!'
            );
            
            // Optional: Open help page
            // chrome.tabs.create({ url: 'https://github.com/amasotti/gmaps-link' });
        } else if (details.reason === 'update') {
            console.log('GMaps Link updated');
        }
    }
}

// Initialize background controller
new BackgroundController();
