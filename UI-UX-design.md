# Xlantis Streamers Live - UI/UX Design Document

## 1. Overview
The **Xlantis Streamers Live** is a Single Page Application (SPA) designed to aggregate and showcase streamers within the Xlantis GTA 5 RP server. The design language is heavily inspired by modern streaming platforms (specifically Kick), providing viewers with a familiar, premium, and highly visual experience.

## 2. Design Aesthetics & Layout (Kick.com Inspired)
The overall layout should mirror the "Browse" or category pages of platforms like Kick.
*   **Theme & Colors:**
    *   **Background:** Deep dark gray/black (e.g., `#0F1215` or `#0B0E11`) to ensure the stream thumbnails pop.
    *   **Text Colors:** High-contrast white for primary text (Streamer Names, Titles) and muted light gray (`#A3A3A3` or `#7E8286`) for secondary text (Categories, Tags).
    *   **Accents:** Platform-specific accent colors (Kick Green `#53FC18`, YouTube Red `#FF0000`).
*   **Typography:** Modern sans-serif (like *Inter* or *Roobert*) with bold weights for streamer names and medium weights for metadata.

## 3. Component Architecture

### 3.1. Header & Navigation
*   **Top Navbar:** Contains the "Xlantis Live" logo and global search (optional).
*   **Filter Bar:**
    *   A prominent, sleek filter bar at the top of the main content area.
    *   **Platform Filter:** Toggle pills (All, Kick, YouTube).
    *   **Group Filter:** Dropdown or pill tabs (All, TVA, KVA, Admins, Others).

### 3.2. Main Content Grid
*   **Layout:** A tight, responsive grid of Streamer Cards (CSS Grid).
    *   Desktop: 4-6 columns.
    *   Tablet: 2-3 columns.
    *   Mobile: 1-2 columns.
*   **Sorting:** Live streamers always appear at the top of the grid. Offline streamers appear below them.

### 3.3. Streamer Card Design (The Core Element)

**A. Live State (Vibrant & Active)**
*   **Thumbnail (Top Section):**
    *   16:9 Aspect Ratio with slightly rounded corners (e.g., `border-radius: 8px`).
    *   Full-color active stream screenshot.
    *   **LIVE Badge:** A distinct red rectangle (e.g., `#E9113C`) in the top-left corner with crisp white text.
    *   **Viewer Count:** A dark, semi-transparent pill in the bottom-left corner with a user icon and count (e.g., `👤 1.2k`).
*   **Metadata (Bottom Section):**
    *   **Avatar:** Circular profile picture positioned below the thumbnail on the left.
    *   **Details Area (Right of Avatar):**
        *   **Streamer Name:** Bold, white text, top-aligned. (Clicking takes user to live URL).
        *   **Stream Title:** slightly smaller text, truncates after 1-2 lines with ellipsis (`text-overflow: ellipsis`).
        *   **Category/Group:** Muted text indicating "Grand Theft Auto V" and their Group (e.g., "TVA").
    *   **Tags:** Small, pill-shaped tags (e.g., `[TVA]`, `[Kick]`, `[RP]`) underneath the title/category.

**B. Offline State (Grayscale & Inactive)**
*   **Thumbnail:** 
    *   16:9 Aspect Ratio.
    *   Displays their channel banner or last VOD thumbnail.
    *   **Visual Filter:** Heavy grayscale (`filter: grayscale(100%); opacity: 0.6;`).
*   **Badges:** No LIVE badge. Viewer count replaced with a dark pill reading "Offline".
*   **Metadata:**
    *   **Avatar:** Circular, but desaturated (`grayscale`).
    *   **Details Area:** 
        *   Streamer Name and Group. Text is muted gray instead of bright white.
        *   Clicking takes the user to their platform homepage.

## 4. User Interaction & Micro-animations
*   **Hover Effects (Live Cards):** 
    *   Hovering over the card slightly translates the thumbnail up (`transform: translateY(-4px);`) or scales it up (`scale(1.02)`).
    *   The streamer's name color changes to the platform's accent color (Kick Green/YouTube Red) on hover.
*   **Hover Effects (Offline Cards):**
    *   Hovering partially restores color (`filter: grayscale(40%); opacity: 0.8;`) to indicate it is clickable, but keeps it distinct from live cards.

## 5. Data Structure Example
```json
{
  "id": "user123",
  "name": "StreamerOne",
  "title": "Chasing the bag in Xlantis | !socials",
  "platform": "kick",
  "group": "TVA",
  "isLive": true,
  "viewers": 340,
  "thumbnailUrl": "...",
  "avatarUrl": "...",
  "liveUrl": "https://kick.com/streamerone",
  "profileUrl": "https://kick.com/streamerone"
}
```
