/**
 * GMaps Link - Content Script
 * Enhances webpages with improved map functionality and Google Maps integration
 */

class MapNavigatorEnhancer {
    constructor() {
        this.settings = {
            openInNewTab: true,
            showConfirmation: false,
            buttonStyle: 'modern',
            customSelectors: [],
            enableOpenStreetMap: false
        };
        this.queryParams = ['q', 'query', 'search', 'term', 'location', 'place'];
        // Default Google Search specific selectors
        this.defaultSelectors = [
            '#lu_map',           // Google local results map
            'div[data-cid]',     // Google local business with maps
            '.rlfl__tls',        // Google local results list
            '.CYJS5e.W0urI.SodP3b.ZHugbd.UivI7b',  // Large knowledge panel maps (popular locations)
            'div[role="region"][aria-label="Map"]'  // Generic map regions in knowledge panels
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
            console.log('[GMaps Link] Extension initialized');
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
     * Get all selectors (default + custom)
     */
    getAllSelectors() {
        const customSelectors = Array.isArray(this.settings.customSelectors) 
            ? this.settings.customSelectors.filter(s => s && s.trim()) 
            : [];
        return [...this.defaultSelectors, ...customSelectors];
    }

    /**
     * Extract search query - prioritize URL params, fallback to page title
     */
    getSearchQuery() {
        const url = new URL(window.location.href);

        // Check URL parameters (most reliable)
        for (const param of this.queryParams) {
            const value = url.searchParams.get(param);
            if (value?.trim()) return value.trim();
        }

        // Fallback to page title
        const title = document.title.trim();
        return title.length > 3 ? title : null;
    }

    /**
     * Generate Google Maps URL
     */
    generateGoogleMapsUrl(query) {
        const encodedQuery = encodeURIComponent(query);
        return `https://www.google.com/maps/search/${encodedQuery}`;
    }

    /**
     * Generate OpenStreetMap URL
     */
    generateOpenStreetMapUrl(query) {
        const encodedQuery = encodeURIComponent(query);
        return `https://www.openstreetmap.org/search?query=${encodedQuery}`;
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

        return button;
    }

    /**
     * Create a simple OpenStreetMap button
     */
    createOpenStreetMapButton(query) {
        const button = document.createElement('button');
        button.className = 'emn-openstreetmap-btn';
        button.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span>Open OSM</span>
    `;
        button.title = `Open "${query}" in OpenStreetMap`;
        button.setAttribute('aria-label', `Open ${query} in OpenStreetMap`);
        button.setAttribute('type', 'button');

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openOpenStreetMap(query);
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
     * Open OpenStreetMap
     */
    async openOpenStreetMap(query) {
        if (this.settings.showConfirmation) {
            const confirmed = confirm(`Open "${query}" in OpenStreetMap?`);
            if (!confirmed) return;
        }

        const url = this.generateOpenStreetMapUrl(query);

        if (this.settings.openInNewTab) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    }



    /**
     * Enhance a map element with minimal UI
     */
    enhanceMapElement(mapElement, query) {
        // Check if this element was already enhanced
        if (this.processedElements.has(mapElement) || mapElement.hasAttribute('data-gmaps-enhanced')) {
            return;
        }
        this.processedElements.add(mapElement);
        mapElement.setAttribute('data-gmaps-enhanced', 'true');

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

        // Add simple button(s) below the map (only if not already added)
        this.addButtonsNearMap(mapElement, query);
    }

    /**
     * Add overlay button on top of map element
     */
    addButtonsNearMap(mapElement, query) {
        // Element is already marked as enhanced in enhanceMapElement
        // This is just for button creation

        // Create and position button
        const addButton = () => {
            // Use OpenStreetMap if enabled, otherwise Google Maps
            const button = this.settings.enableOpenStreetMap 
                ? this.createOpenStreetMapButton(query)
                : this.createGoogleMapsButton(query);
            
            // Position button as overlay in bottom-right corner of map
            button.style.cssText = `
                position: absolute;
                bottom: 8px;
                right: 8px;
                padding: 6px 8px;
                z-index: 9999;
                pointer-events: auto;
                opacity: 1;
                font-size: 1em;
                transition: opacity 0.3s ease;
            `;
            
            // Ensure map element has relative positioning and can show overflow
            const mapStyle = window.getComputedStyle(mapElement);
            if (mapStyle.position === 'static') {
                mapElement.style.position = 'relative';
            }
            
            // For small maps, ensure they can show the button
            if (mapElement.offsetHeight < 100 || mapElement.offsetWidth < 150) {
                mapElement.style.overflow = 'visible';
                // Position button slightly outside for very small maps
                button.style.bottom = '-2px';
                button.style.right = '-2px';
            }
            
            // Add button directly to map element
            mapElement.appendChild(button);
            
            // Debug: Make button more visible for small maps
            if (mapElement.offsetHeight < 80) {
                button.style.background = this.settings.enableOpenStreetMap ? '#44ff44' : '#ff4444';
                button.style.color = 'white';
                button.innerHTML = this.settings.enableOpenStreetMap ? '🗺️' : '📍';
                button.style.fontSize = '12px';
                button.style.padding = '2px 4px';
            }
            
            const mapType = this.settings.enableOpenStreetMap ? 'OpenStreetMap' : 'Google Maps';
            console.log(`[GMaps Link] ${mapType} button added to map: ${mapElement.tagName}#${mapElement.id}`);
        };

        // Add button immediately for debugging
        addButton();
    }


    /**
     * Setup map enhancements
     */
    setupMapEnhancements() {
        // Prevent multiple simultaneous processing
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        const query = this.getSearchQuery();
        if (!query) {
            this.isProcessing = false;
            return;
        }

        // Find and enhance map elements (deduplicate across selectors)
        const foundElements = new Set();
        const allSelectors = this.getAllSelectors();
        
        allSelectors.forEach(selector => {
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
        
        if (foundElements.size > 0) {
            console.log(`[GMaps Link] Enhanced ${foundElements.size} map(s) for: "${query}"`);
        }
        
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
                            const maps = node.querySelectorAll?.(this.getAllSelectors().join(','));
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
