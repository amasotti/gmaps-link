/**
 * GMaps Link - Content Script
 * Enhances webpages with improved map functionality and Google Maps integration
 */

class MapNavigatorEnhancer {
    constructor() {
        this.settings = {
            openInNewTab: true,
            showConfirmation: false,
            buttonStyle: 'modern'
        };
        this.queryParams = ['q', 'query', 'search', 'term', 'location', 'place'];
        this.mapSelectors = [
            // Generic map selectors
            '[id*="map"]',
            '[class*="map"]',
            '[data-map]',
            'iframe[src*="maps.google.com"]',
            'iframe[src*="openstreetmap"]',
            // Specific selectors for common sites
            '#lu_map',
            '#dimg_1',
            '.map-container',
            '.map-wrapper',
            '.location-map',
            // Business listing selectors
            '[data-testid*="map"]',
            '[aria-label*="map"]',
            '[role="img"][alt*="map"]'
        ];
        this.processedElements = new WeakSet();
        this.isProcessing = false;
        this.enhanceTimeout = null;
        this.init();
    }

    /**
     * Initialize the extension
     */
    async init() {
        try {
            await this.loadSettings();
            this.setupMapEnhancements();
            this.observePageChanges();
            console.log('GMaps Link initialized');
        } catch (error) {
            console.error('Failed to initialize GMaps Link:', error);
        }
    }

    /**
     * Load user settings from Chrome storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(this.settings);
            this.settings = { ...this.settings, ...result };
        } catch (error) {
            console.warn('Using default settings:', error);
        }
    }

    /**
     * Extract search query from various sources
     */
    getSearchQuery() {
        const url = new URL(window.location.href);

        // Try URL parameters
        for (const param of this.queryParams) {
            const value = url.searchParams.get(param);
            if (value) return value;
        }

        // Try page title
        const title = document.title;
        if (title && title.length > 3) {
            return title;
        }

        // Try meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc?.content) {
            return metaDesc.content;
        }

        // Try to extract from page content
        const headings = document.querySelectorAll('h1, h2, h3');
        for (const heading of headings) {
            const text = heading.textContent?.trim();
            if (text && text.length > 3 && text.length < 100) {
                return text;
            }
        }

        return null;
    }

    /**
     * Generate Google Maps URL
     */
    generateGoogleMapsUrl(query) {
        const encodedQuery = encodeURIComponent(query);
        return `https://www.google.com/maps/search/${encodedQuery}`;
    }

    /**
     * Create a simple Google Maps button
     */
    createGoogleMapsButton(query) {
        const button = document.createElement('button');
        button.className = 'emn-google-maps-btn';
        button.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span>Open Gmaps</span>
    `;
        button.title = `Open "${query}" in Google Maps`;
        button.setAttribute('aria-label', `Open ${query} in Google Maps`);
        button.setAttribute('type', 'button');

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openGoogleMaps(query);
        });

        // Add keyboard support
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.openGoogleMaps(query);
            }
        });

        return button;
    }

    /**
     * Create Google Maps button (no wrapper needed)
     */
    createMapButton(query) {
        return this.createGoogleMapsButton(query);
    }


    /**
     * Open Google Maps
     */
    async openGoogleMaps(query) {
        if (this.settings.showConfirmation) {
            const confirmed = confirm(`Open "${query}" in Google Maps?`);
            if (!confirmed) return;
        }

        const url = this.generateGoogleMapsUrl(query);

        if (this.settings.openInNewTab) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    }

    /**
     * Get directions to location
     */
    getDirections(query) {
        const encodedQuery = encodeURIComponent(query);
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;
        window.open(directionsUrl, '_blank', 'noopener,noreferrer');
    }


    /**
     * Enhance a map element with minimal UI
     */
    enhanceMapElement(mapElement, query) {
        if (this.processedElements.has(mapElement)) {
            console.log('Map already processed');
            return;
        }
        this.processedElements.add(mapElement);

        console.log('Processing map element');

        // Add minimal visual indicator (just on hover)
        mapElement.classList.add('emn-enhanced-map');
        mapElement.title = `Click to open "${query}" in Google Maps`;
        
        // Make clickable but don't add intrusive ARIA (let existing map accessibility work)
        mapElement.style.cursor = 'pointer';
        
        const clickHandler = (e) => {
            // Don't interfere with existing functionality
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            // Don't interfere if user is interacting with map controls
            if (e.target.closest('[class*="control"], [class*="widget"], [role="button"]')) return;

            e.preventDefault();
            this.openGoogleMaps(query);
        };
        
        mapElement.addEventListener('click', clickHandler);

        // Add simple button below the map (only if not already added)
        this.addButtonsNearMap(mapElement, query);
    }

    /**
     * Add overlay button on top of map element
     */
    addButtonsNearMap(mapElement, query) {
        // Check if this map already has been processed
        if (mapElement.hasAttribute('data-gmaps-enhanced')) {
            console.log('Map already enhanced, skipping');
            return;
        }
        
        // Mark map as being processed
        mapElement.setAttribute('data-gmaps-enhanced', 'true');

        // Wait for map to load to avoid interference
        const addButton = () => {
            console.log('Creating button for map element');
            
            // Create button
            const button = this.createMapButton(query);
            
            // Position button as overlay in bottom-right corner of map
            button.style.cssText = `
                position: absolute;
                bottom: 8px;
                right: 8px;
                z-index: 1001;
                pointer-events: auto;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            // Ensure map element has relative positioning to contain absolute positioned button
            const mapStyle = window.getComputedStyle(mapElement);
            if (mapStyle.position === 'static') {
                mapElement.style.position = 'relative';
            }
            
            // Add button directly to map element
            mapElement.appendChild(button);
            
            // Fade in the button after a short delay
            setTimeout(() => {
                button.style.opacity = '1';
            }, 100);
        };

        // Add button immediately for debugging
        addButton();
    }

    /**
     * Get distance between two elements
     */
    getElementDistance(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();

        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;

        return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
    }

    /**
     * Setup map enhancements
     */
    setupMapEnhancements() {
        // Prevent multiple simultaneous processing
        if (this.isProcessing) {
            console.log('Enhancement already in progress, skipping');
            return;
        }
        
        this.isProcessing = true;
        
        const query = this.getSearchQuery();
        if (!query) {
            console.log('No search query found, map enhancement limited');
            this.isProcessing = false;
            return;
        }

        console.log('Enhancing maps with query:', query);

        // Find and enhance map elements (deduplicate across selectors)
        const foundElements = new Set();
        
        this.mapSelectors.forEach(selector => {
            try {
                const mapElements = document.querySelectorAll(selector);
                mapElements.forEach(element => {
                    if (element.offsetWidth > 50 && element.offsetHeight > 50) { // Skip tiny elements
                        foundElements.add(element);
                    }
                });
            } catch (error) {
                console.warn(`Error processing selector ${selector}:`, error);
            }
        });

        // Process each unique element only once
        foundElements.forEach(element => {
            this.enhanceMapElement(element, query);
        });
        
        const totalFound = foundElements.size;
        console.log(`GMaps Link: Enhanced ${totalFound} maps`);
        
        // Reset processing flag
        this.isProcessing = false;
    }

    /**
     * Observe page changes for dynamic content
     */
    observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            let hasNewMaps = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the node itself is a map
                            if (this.isMapElement(node)) {
                                hasNewMaps = true;
                            }
                            // Check for maps within the node
                            const maps = node.querySelectorAll?.(this.mapSelectors.join(','));
                            if (maps?.length > 0) {
                                hasNewMaps = true;
                            }
                        }
                    });
                }
            });

            if (hasNewMaps && !this.isProcessing) {
                // Debounce to avoid excessive processing
                clearTimeout(this.enhanceTimeout);
                this.enhanceTimeout = setTimeout(() => {
                    this.setupMapEnhancements();
                }, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }


    /**
     * Check if element is likely a map
     */
    isMapElement(element) {
        try {
            const id = element.id?.toLowerCase() || '';
            const className = element.className?.toString().toLowerCase() || '';
            const tagName = element.tagName?.toLowerCase() || '';

            return (
                id.includes('map') ||
                className.includes('map') ||
                element.hasAttribute('data-map') ||
                (tagName === 'iframe' && (
                    element.src?.includes('maps.google.com') ||
                    element.src?.includes('openstreetmap')
                ))
            );
        } catch (error) {
            console.warn('Error checking map element:', error);
            return false;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MapNavigatorEnhancer();
    });
} else {
    new MapNavigatorEnhancer();
}
