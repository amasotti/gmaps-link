# Datenschutz-Informationen für Chrome Web Store

## 1. Alleiniger Zweck (Single Purpose)

**Deutsch:**
Diese Erweiterung dient einem einzigen, klar verständlichen Zweck: Die Wiederherstellung der direkten Google
Maps-Funktionalität in Google-Suchergebnissen und anderen Webseiten mit eingebetteten Karten. Die Erweiterung fügt
klickbare Bereiche und Buttons hinzu, um Kartenbereiche direkt in Google Maps zu öffnen, eine Funktionalität, die
aufgrund regulatorischer Änderungen entfernt wurde.

**English:**
This extension serves a single, clearly understandable purpose: restoring direct Google Maps functionality to Google
Search results and other websites with embedded maps. The extension adds clickable areas and buttons to open map regions
directly in Google Maps, functionality that was removed due to regulatory changes.

## 2. Berechtigungen-Erklärungen (Permissions Justification)

### `activeTab`

**Deutsch:** Zugriff auf den aktuell aktiven Tab, um Kartenelemente zu erkennen und zu erweitern. Notwendig, um die
Hauptfunktionalität der Erweiterung auf der Webseite bereitzustellen.

**English:** Access to the currently active tab to detect and enhance map elements. Required to provide the extension's
core functionality on web pages.

### `storage`

**Deutsch:** Speicherung von Benutzereinstellungen wie benutzerdefinierte CSS-Selektoren, Öffnungsverhalten (neuer
Tab/aktueller Tab) und Bestätigungsdialoge. Alle Daten werden lokal im Browser gespeichert, keine externe Übertragung.

**English:** Storage of user preferences such as custom CSS selectors, opening behavior (new tab/current tab), and
confirmation dialogs. All data is stored locally in the browser with no external transmission.

### `scripting`

**Deutsch:** Einbettung von Content-Scripts zur Erkennung von Kartenelementen und Hinzufügung der Google
Maps-Funktionalität. Erforderlich für die Kernfunktion der Kartenerkennung und Button-Erstellung.

**English:** Injection of content scripts to detect map elements and add Google Maps functionality. Required for the
core function of map detection and button creation.

### `notifications`

**Deutsch:** Anzeige von optionalen Benachrichtigungen bei Fehlern oder wichtigen Statusmeldungen. Wird nur verwendet,
um den Benutzer über den Status der Kartenerkennung zu informieren.

**English:** Display of optional notifications for errors or important status messages. Only used to inform users about
map detection status.

### `host_permissions` ("https://*/*", "http://*/*")

**Deutsch:** Zugriff auf alle Webseiten, um Karten universell zu erkennen. Da Karten auf verschiedensten Webseiten
eingebettet sein können (Restaurants, Immobilien, Events, etc.), ist dieser umfassende Zugriff notwendig, um die
Funktionalität bereitzustellen. Die Erweiterung sammelt keine Daten und führt nur lokale Verarbeitung durch.

**English:** Access to all websites to universally detect maps. Since maps can be embedded on various types of
websites (restaurants, real estate, events, etc.), this comprehensive access is necessary to provide functionality. The
extension collects no data and performs only local processing.

## 3. Datenschutz-Grundsätze

- **Keine Datensammlung:** Die Erweiterung sammelt, speichert oder überträgt keine persönlichen Daten
- **Lokale Verarbeitung:** Alle Funktionen laufen vollständig im Browser des Benutzers
- **Kein Tracking:** Keine Verfolgung von Benutzeraktivitäten oder Webseiten-Besuchen
- **Open Source:** Der Quellcode ist öffentlich einsehbar für Transparenz und Überprüfung
- **Minimale Berechtigungen:** Nur notwendige Berechtigungen für die Kernfunktionalität

## 4. Verwendung von Berechtigungen

Die Erweiterung verwendet ihre Berechtigungen ausschließlich für den deklarierten Zweck:

- Erkennung von Kartenelementen auf Webseiten
- Hinzufügung von klickbaren Bereichen und Buttons
- Speicherung von Benutzereinstellungen lokal
- Öffnung von Google Maps bei Benutzerinteraktion

Es erfolgt keine Datenübertragung an externe Server oder Drittanbieter.
