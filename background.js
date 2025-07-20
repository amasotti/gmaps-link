/**
 * GMaps Link - Background Script
 * Handles extension installation events
 *
 * This class takes care of managing the background processes of the GMaps Link extension,
 * passing the settings to the content scripts and handling notifications.
 */

class BackgroundController {
    constructor() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for extension events
     */
    setupEventListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
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
                'Click on map areas in Google Search results to open them in Google Maps!'
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
