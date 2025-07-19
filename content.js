/**
 * Enhanced Map Navigator - Content Script
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
            console.log('Enhanced Map Navigator initialized');
        } catch (error) {
            console.error('Failed to initialize Enhanced Map Navigator:', error);
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
     * Create a Google Maps button
     */
    createGoogleMapsButton(query) {
        const button = document.createElement('button');
        button.className = 'emn-google-maps-btn';
        button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span>Open in Google Maps</span>
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
     * Create button container for map actions
     */
    createButtonContainer(query) {
        const container = document.createElement('div');
        container.className = 'emn-button-container';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', `Map actions for ${query}`);

        const mapsButton = this.createGoogleMapsButton(query);
        container.appendChild(mapsButton);

        // Add additional buttons
        const directionsButton = this.createDirectionsButton(query);
        container.appendChild(directionsButton);

        return container;
    }

    /**
     * Create directions button
     */
    createDirectionsButton(query) {
        const button = document.createElement('button');
        button.className = 'emn-directions-btn';
        button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.39.39-1.02 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/>
      </svg>
      <span>Directions</span>
    `;
        button.title = `Get directions to "${query}"`;
        button.setAttribute('aria-label', `Get directions to ${query}`);
        button.setAttribute('type', 'button');

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.getDirections(query);
        });

        // Add keyboard support
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.getDirections(query);
            }
        });

        return button;
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
     * Find action button containers on the page
     */
    findActionButtonContainers() {
        const selectors = [
            '.actions',
            '.buttons',
            '.button-group',
            '.map-actions',
            '.location-actions',
            '[class*="action"]',
            '[class*="button"]',
            '.reviews',
            '.directions',
            '.contact-info',
            '.business-actions'
        ];

        const containers = [];
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            containers.push(...elements);
        }

        return containers;
    }

    /**
     * Enhance a map element
     */
    enhanceMapElement(mapElement, query) {
        if (this.processedElements.has(mapElement)) return;
        this.processedElements.add(mapElement);

        // Add visual indicator
        mapElement.classList.add('emn-enhanced-map');
        mapElement.title = `Enhanced map: Click to open "${query}" in Google Maps`;
        
        // Add ARIA attributes
        mapElement.setAttribute('role', 'button');
        mapElement.setAttribute('aria-label', `Interactive map for ${query}. Click to open in Google Maps`);
        mapElement.setAttribute('tabindex', '0');

        // Make clickable
        mapElement.style.cursor = 'pointer';
        
        const clickHandler = (e) => {
            // Don't interfere with existing functionality
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            e.preventDefault();
            this.openGoogleMaps(query);
        };
        
        mapElement.addEventListener('click', clickHandler);
        
        // Add keyboard support
        mapElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openGoogleMaps(query);
            }
        });

        // Try to add button container near the map
        this.addButtonsNearMap(mapElement, query);
    }

    /**
     * Add buttons near map element
     */
    addButtonsNearMap(mapElement, query) {
        // Look for existing action containers
        const parent = mapElement.parentElement;
        const actionContainers = this.findActionButtonContainers();

        // Find the closest action container
        let targetContainer = null;
        let minDistance = Infinity;

        actionContainers.forEach(container => {
            const distance = this.getElementDistance(mapElement, container);
            if (distance < minDistance && distance < 500) { // Within 500px
                minDistance = distance;
                targetContainer = container;
            }
        });

        if (targetContainer) {
            // Add buttons to existing container
            const buttonContainer = this.createButtonContainer(query);
            buttonContainer.style.display = 'inline-flex';
            buttonContainer.style.marginLeft = '10px';
            targetContainer.appendChild(buttonContainer);
        } else {
            // Create new container near the map
            const buttonContainer = this.createButtonContainer(query);
            buttonContainer.style.position = 'absolute';
            buttonContainer.style.top = '10px';
            buttonContainer.style.right = '10px';
            buttonContainer.style.zIndex = '1000';

            // Make parent relative if needed
            const computedStyle = window.getComputedStyle(parent);
            if (computedStyle.position === 'static') {
                parent.style.position = 'relative';
            }

            parent.appendChild(buttonContainer);
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
     * Check if element is likely a map
     */
    isMapElement(element) {
        const id = element.id?.toLowerCase() || '';
        const className = element.className?.toLowerCase() || '';
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
