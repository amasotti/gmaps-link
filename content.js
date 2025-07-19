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
     * Create overlay button container
     */
    createButtonContainer(query) {
        const container = document.createElement('div');
        container.className = 'emn-button-container emn-overlay';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', `Map actions for ${query}`);

        const mapsButton = this.createGoogleMapsButton(query);
        container.appendChild(mapsButton);

        return container;
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
        const mapId = this.generateMapId(mapElement);
        if (this.processedElements.has(mapElement)) {
            console.log(`Map already processed: ${mapId}`);
            return;
        }
        this.processedElements.add(mapElement);

        console.log(`Processing map: ${mapId}`);

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
        // Check if we already added a button for this map
        const mapId = this.generateMapId(mapElement);
        const existingButton = document.querySelector(`[data-map-id="${mapId}"]`);
        if (existingButton) {
            console.log('Button already exists for this map, skipping');
            return;
        }

        // Wait for map to load to avoid interference
        const addButton = () => {
            // Create button container with unique identifier
            const buttonContainer = this.createButtonContainer(query);
            buttonContainer.setAttribute('data-map-id', mapId);
            
            // Position button as overlay in bottom-right corner of map
            buttonContainer.style.cssText = `
                position: absolute;
                bottom: 8px;
                right: 8px;
                z-index: 1001;
                pointer-events: auto;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(4px);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            // Ensure map element has relative positioning to contain absolute positioned button
            const mapStyle = window.getComputedStyle(mapElement);
            if (mapStyle.position === 'static') {
                mapElement.style.position = 'relative';
            }
            
            // Add button directly to map element
            mapElement.appendChild(buttonContainer);
            
            // Fade in the button after a short delay
            setTimeout(() => {
                buttonContainer.style.opacity = '1';
            }, 100);
        };

        // Delay button creation to not interfere with map loading
        if (mapElement.complete === false || mapElement.tagName === 'IMG') {
            // For images, wait for load event
            if (mapElement.tagName === 'IMG') {
                if (mapElement.complete) {
                    setTimeout(addButton, 500);
                } else {
                    mapElement.addEventListener('load', () => {
                        setTimeout(addButton, 200);
                    }, { once: true });
                }
            } else {
                setTimeout(addButton, 1000);
            }
        } else {
            setTimeout(addButton, 200);
        }
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
        const query = this.getSearchQuery();
        if (!query) {
            console.log('No search query found, map enhancement limited');
            return;
        }

        console.log('Enhancing maps with query:', query);

        // Find and enhance map elements
        this.mapSelectors.forEach(selector => {
            try {
                const mapElements = document.querySelectorAll(selector);
                mapElements.forEach(element => {
                    if (element.offsetWidth > 50 && element.offsetHeight > 50) { // Skip tiny elements
                        this.enhanceMapElement(element, query);
                    }
                });
            } catch (error) {
                console.warn(`Error processing selector ${selector}:`, error);
            }
        });
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

            if (hasNewMaps) {
                // Debounce to avoid excessive processing
                clearTimeout(this.enhanceTimeout);
                this.enhanceTimeout = setTimeout(() => {
                    this.setupMapEnhancements();
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Generate unique ID for a map element
     */
    generateMapId(element) {
        const id = element.id || '';
        const className = element.className || '';
        const tagName = element.tagName || '';
        const rect = element.getBoundingClientRect();
        
        // Create a unique identifier based on element properties
        return `map-${tagName}-${id}-${className.replace(/\s+/g, '-')}-${Math.round(rect.top)}-${Math.round(rect.left)}`
            .replace(/[^a-zA-Z0-9-]/g, '')
            .substring(0, 50);
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
