

**This is the SINGLE SOURCE OF TRUTH for the YatraX project. Read everything before writing any code. Every design decision, visual specification, interaction pattern, data model, and architectural choice is documented here.**

---

## SECTION 1: PROJECT OVERVIEW

### What Is YatraX

YatraX (Yatra = Journey in Sanskrit + X = Next-gen) is a mobile-first Progressive Web App that provides real-time AI-powered safety intelligence to tourists. It continuously analyzes the tourist's surroundings using 153 factors across 16 categories and provides proactive alerts BEFORE danger occurs — not just reactive warnings.

The app's entire visual identity — colors, animation speeds, glow intensities — shifts dynamically based on the current ML-calculated safety score, making the interface itself a safety indicator. The app feels alive and responsive to the environment.


---

## SECTION 2: COMPLETE TECH STACK

### Frontend Core
- React 19 with concurrent features
- TypeScript 5.7 in strict mode
- Vite 6 as bundler with HMR

### Styling and UI
- Tailwind CSS v4 with CSS-first configuration using @theme block
## SECTION 3: TECH STACK

### Frontend (Tourist Native App Experience)
- **Framework:** React 19 (concurrent transitions) + TypeScript 5.7 (strict)
- **Vite 6 Frontend Tooling:** HMR, optimized builds
- **Styling:** Tailwind CSS v4 (@theme block, no legacy config file)
- **UI Components:** shadcn/ui + custom glassmorphism components
- **Icons:** Lucide React
- **Mapping:** React-Leaflet 4.2.1 + Leaflet 1.9.4
- **State:** React Context API (Session, Theme, SOS) + localStorage caching
- **Offline:** Service Worker + IndexedDB (future map tile cache)

### Backend (Currently Separate Node Repository)
- **Runtime:** Node.js
- **Framework:** Express.js (REST API + Controllers + Middleware)
- **Database:** MongoDB
- **ORM:** Mongoose (Schemas, geospatial queries)
- **Real-time:** WebSocket Server (simple `ws` implementation)
- **Security:** Standard CORS, Express JSON parser

### Google Maps Platform (Data Only, No Rendering)
Critical architectural decision: Google provides DATA, Leaflet provides MAP RENDERING. We never load the Google Maps JavaScript API for tile rendering.

APIs used:
- Places API (New) — search autocomplete, place details, nearby search, place photos
- Directions API — route calculation with alternatives, polyline decoding
- Distance Matrix API — real travel time to police stations and hospitals
- Geocoding API — reverse geocode for SOS address context and location labels
- Air Quality API — AQI data as safety score factor
- Geolocation API — WiFi-based positioning fallback when GPS fails

Estimated cost: $400-600/month for 1000 active users without caching, $100-150/month with aggressive caching

### Environment Variables
```
VITE_API_BASE_URL        — Backend API base URL
VITE_WS_URL              — WebSocket endpoint
VITE_GOOGLE_MAPS_API_KEY — Google Maps Platform key
VITE_ENABLE_GOOGLE_PLACES          — Feature flag (boolean)
VITE_ENABLE_GOOGLE_DIRECTIONS      — Feature flag
VITE_ENABLE_GOOGLE_GEOCODING       — Feature flag
VITE_ENABLE_GOOGLE_DISTANCE_MATRIX — Feature flag
VITE_ENABLE_GOOGLE_AIR_QUALITY     — Feature flag
VITE_APP_VERSION                   — Semantic version string
```

Backend auth environment variables:
```
WEBAUTHN_RP_ID   — Relying party ID (domain) for WebAuthn
WEBAUTHN_ORIGIN  — Allowed origin for WebAuthn requests
```

When Google feature flags are disabled, the app falls back to: Nominatim for search, straight-line distance for routing, no AQI data.

---

## SECTION 3: DESIGN SYSTEM — "Glassmorphism Safety"

### Visual Philosophy

"Premium frosted-glass aesthetic that breathes with the environment."

The app does not just display safety data — it BECOMES the safety state. The entire color palette, animation speed, glow intensity, and SOS ball size shifts based on the ML safety score. Every glass card, every button, every badge reflects the current safety context.

### Core Design Principles
1. Glassmorphism First — every overlay uses frosted-glass effect
2. Dynamic Theming — entire palette shifts with safety score
3. Smooth Transitions — 2-second color interpolations in oklch color space
4. Mobile-Native Feel — active states over hover, 44px minimum touch targets
5. Accessibility Always — color is never the only indicator, aria-labels everywhere
6. Dark Mode Responsive — auto-switches at 6 PM and 6 AM, user-overrideable

---

## SECTION 4: DYNAMIC COLOR SYSTEM

The safety score (0-100) drives three distinct theme states. Every 30 seconds or on significant location change, the backend calculates a new score and the entire app transitions smoothly.

### Theme State: SAFE (Score 80-100)
Emotion: Calm, peaceful, reassuring

CSS Variables:
- --theme-bg-from: oklch(0.97 0.03 160) — soft emerald wash
- --theme-bg-to: oklch(0.97 0.02 180) — cyan tint
- --theme-primary: oklch(0.65 0.17 160) — emerald-500 base
- --theme-primary-foreground: oklch(0.99 0 0)
- --theme-glow: oklch(0.65 0.17 160 / 0.15) — subtle emerald glow
- --theme-card-bg: rgba(255, 255, 255, 0.70)
- --theme-card-border: rgba(16, 185, 129, 0.15)
- --sos-scale: 1
- --sos-pulse-speed: 3s — slow calm pulse

Visual appearance: Background has gentle emerald gradient barely perceptible. Glass cards have emerald-tinted borders. SOS ball is 48px pulsing slowly. Status badge reads "Low Risk" in emerald. All interactive elements use emerald accent.

### Theme State: CAUTION (Score 50-79)
Emotion: Alert, attentive, watchful

CSS Variables:
- --theme-bg-from: oklch(0.97 0.03 85) — warm amber wash
- --theme-bg-to: oklch(0.97 0.02 95) — yellow tint
- --theme-primary: oklch(0.68 0.15 85) — amber-500 base
- --theme-primary-foreground: oklch(0.99 0 0)
- --theme-glow: oklch(0.68 0.15 85 / 0.15) — amber glow
- --theme-card-bg: rgba(255, 255, 255, 0.70)
- --theme-card-border: rgba(245, 158, 11, 0.15)
- --sos-scale: 1.17
- --sos-pulse-speed: 2s — medium pulse

Visual appearance: Background shifts to warm amber gradient. Glass cards have amber-tinted borders. SOS ball grows to 56px and pulses faster. Status badge reads "Moderate Risk" in amber. Transition from previous state is smooth 2-second fade.

### Theme State: DANGER (Score 0-49)
Emotion: Urgent, alarming, protective

CSS Variables:
- --theme-bg-from: oklch(0.97 0.03 25) — urgent red wash
- --theme-bg-to: oklch(0.97 0.02 35) — orange-red tint
- --theme-primary: oklch(0.62 0.23 25) — red-500 base
- --theme-primary-foreground: oklch(0.99 0 0)
- --theme-glow: oklch(0.62 0.23 25 / 0.20) — intense red glow at 20%
- --theme-card-bg: rgba(255, 255, 255, 0.75) — slightly more opaque
- --theme-card-border: rgba(220, 38, 38, 0.20)
- --sos-scale: 1.33
- --sos-pulse-speed: 1s — aggressive rapid pulse

Visual appearance: Background has urgent red gradient more noticeable than other states. Glass cards have red-tinted borders with stronger glow. SOS ball grows to 64px pulsing rapidly. Status badge reads "High Risk" in red with alert icon. Digital ID card border glows red subtly. Map risk zones appear more prominent.

### Theme Transition Mechanics

All animatable CSS custom properties are registered with @property declarations so browsers can interpolate them smoothly:

```
@property --theme-primary {
  syntax: '<color>';
  initial-value: oklch(0.65 0.17 160);
  inherits: true;
}
```

The :root element uses SPECIFIC property transitions (NOT "transition: all 2s" which destroys performance):

```
:root {
  transition-property: --theme-primary, --theme-bg-from, --theme-bg-to,
                       --theme-glow, --theme-card-border, --sos-scale;
  transition-duration: 2s;
  transition-timing-function: ease-in-out;
}
```

Why oklch color space: perceptually uniform (humans perceive transitions as smooth), wide gamut (richer colors than RGB/HSL), predictable interpolation (no unexpected hue shifts during transition), modern browser support above 90% with graceful degradation.

The ThemeProvider updates BOTH our custom --theme-* variables AND shadcn's --color-primary (converted to HSL) simultaneously so that all shadcn components (buttons, badges, inputs, switches) shift color together with the theme.

---

## SECTION 5: GLASS CARD HIERARCHY

Three levels of glassmorphism with precise opacity and blur values. Higher levels are more prominent.

### Level 1: Hero Cards (Highest Prominence)
Used for: Safety score hero card, digital ID card front

- background: var(--theme-card-bg) at 70% opacity white
- backdrop-filter: blur(20px)
- border: 1px solid var(--theme-card-border)
- box-shadow: 0 8px 32px var(--theme-glow), 0 4px 16px rgba(0,0,0,0.04)
- border-radius: 24px (rounded-3xl)
- Dark mode: bg rgba(30,41,59,0.70) with white/5 border, glow shadow intensified

### Level 2: Action Cards (Medium Prominence)
Used for: Quick action buttons, alert list items, destination bar, search results

- background: rgba(255,255,255,0.50)
- backdrop-filter: blur(16px)
- border: 1px solid rgba(0,0,0,0.04)
- box-shadow: 0 4px 16px rgba(0,0,0,0.03)
- border-radius: 16px (rounded-2xl)
- Dark mode: bg rgba(30,41,59,0.50) with white/4 border

### Level 3: Info Cards (Lowest Prominence)
Used for: Daily tip, settings sections, bottom sheet content

- background: rgba(255,255,255,0.30)
- backdrop-filter: blur(12px)
- border: 1px solid rgba(0,0,0,0.02)
- box-shadow: none
- border-radius: 12px (rounded-xl)
- Dark mode: bg rgba(30,41,59,0.30) with white/3 border

### Glass on Glass Rule
When nesting glass cards, child uses the next level down. Level 1 hero containing Level 2 actions. Never same level inside same level (causes visual muddiness).

---

## SECTION 6: GRADIENT MESH BACKGROUND

Fixed full-screen layer behind all content providing a dynamic animated background that reinforces theme state without being distracting.

Structure: 3-4 radial gradients using theme color variables, animated with a slow 60-second CSS animation loop. Pure CSS, no JavaScript animation frames, GPU-accelerated.

Light mode opacity: 0.4
Dark mode opacity: 0.15 (much subtler)

In safe theme: gentle emerald orbs drifting slowly
In caution theme: warm amber orbs with slightly more energy
In danger theme: urgent red orbs with heightened presence

Transition: 2-second smooth fade when theme changes (driven by the CSS variable transitions)

Reduced motion: animation disabled, static at 20% opacity

---

## SECTION 7: TYPOGRAPHY SCALE

Constrained type scale optimized for mobile-first readability:

- text-4xl (36px): Safety score number only
- text-3xl (30px): Page titles
- text-2xl (24px): Section headers
- text-xl (20px): Card titles
- text-lg (18px): Prominent labels, user name in header
- text-base (16px): Default body text
- text-sm (14px): Secondary text, labels, button text
- text-xs (12px): Tertiary text, captions, timestamps
- text-[10px]: Micro labels, badge text, tab labels
- text-[9px]: Smallest text (legend items, fine print)

Font stack: system fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif)

Font weights: bold (700) for score and card titles, semibold (600) for section headers, medium (500) for buttons and badges, normal (400) for body text

Line heights: 1.1 for display (large numbers), 1.2 for headings, 1.5 for body, 1.4 for UI elements

---

## SECTION 8: SPACING AND LAYOUT

Safe area support: padding-top env(safe-area-inset-top) on StatusBar, padding-bottom env(safe-area-inset-bottom) on BottomNav and floating elements

Page container padding: 16px horizontal, top includes safe-area, bottom includes 80px for tab nav plus safe-area

Card spacing: space-y-4 (16px) between cards on home, space-y-6 (24px) between sections, gap-3 (12px) inside cards, gap-2 (8px) for tight groups like badges

Touch targets: minimum 44px by 44px everywhere, no exceptions. Buttons, links, interactive areas all meet this requirement.

---

## SECTION 9: ANIMATION SYSTEM

### Philosophy
Purposeful not decorative. Fast (200-400ms) for UI interactions. Slow (1-2s) for theme transitions. Smooth with appropriate easing. Skippable via prefers-reduced-motion.

### Core Animations

1. Theme Transition: 2000ms ease-in-out on :root CSS variables. Long enough to notice, short enough not to annoy. Feels organic.

2. Safety Score Morph: requestAnimationFrame-based smooth counting animation, NOT stepping. Duration 800ms, easeOutCubic easing (starts fast, ends slow — feels natural for numbers). Animates from previous score to new score.

3. Card Entrance: Staggered slide-in-up animation. Each child delayed by 60ms (child 1 at 0ms, child 2 at 60ms, child 3 at 120ms, up to 8 children). Each animation: 400ms ease-out, translateY(12px) to translateY(0) with opacity 0 to 1.

4. SOS Ball Pulse: Keyframe animation with speed tied to theme. Box-shadow expands from 0 to 12px then fades. Safe: 3s, Caution: 2s, Danger: 1s.

5. Countdown Pop: 400ms ease-out. Scale from 0.3 to 1.15 (overshoot) to 1.0, with opacity 0 to 1. Used for 3-2-1 countdown numbers.

6. Touch Feedback: 100ms ease-out, scale(0.97) plus opacity 0.9 on :active state. Applied to all interactive elements via .touch-action class. -webkit-tap-highlight-color: transparent.

7. Gradient Mesh Drift: 60-second loop, 4 blobs drifting with scale variations. Pure CSS keyframes.

8. Directional Bounce: 1s infinite ease-in-out. Four variants (left, right, up, down) each bouncing 8px in their direction. Used for SOS swipe guide arrows.

9. Holographic Shift: 6s ease-in-out infinite. Background-position shift creating shimmer effect on ID card.

10. Draw Ring: SVG stroke-dashoffset animation for the safety score ring progress.

### Reduced Motion
All animations disabled via @media (prefers-reduced-motion: reduce). Stagger children render at full opacity immediately. Gradient mesh becomes static at 20% opacity. SOS pulse becomes static glow.

---

## SECTION 10: DARK MODE SYSTEM

### Auto-Switch Logic
Default preference: "auto"
Storage key: "safeguard-theme-mode" in localStorage
Values: "light", "dark", "auto"
Auto behavior: Dark mode activates at 6 PM (hour >= 18), light mode at 6 AM (hour < 6)
Implementation: Class-based (.dark on html element)

### Dark Mode Adjustments

Base colors in dark mode:
- --color-background: hsl(222 47% 6%) — near-black slate
- --color-foreground: hsl(210 40% 98%) — near-white
- --color-card: hsl(222 47% 8%) — slightly lighter slate
- --color-muted: hsl(217 33% 17%) — medium slate
- --color-border: hsl(217 33% 17%)

Glass cards: bg-slate-800/70 with white/5 borders
Safety theme glows: Intensity increases from 15% to 25% in dark mode because colored glows are more visible against dark backgrounds and create beautiful halos
Map tiles: Switch from OpenStreetMap standard to CartoDB Dark Matter
Digital ID card: Premium black card finish (like Amex Centurion) instead of white
Leaflet popups and tooltips: Dark background (slate-950/92) with white/6 borders

### Dark Mode Detection
MutationObserver watches for class changes on document.documentElement to detect when .dark is toggled. This drives map tile URL switching and other dark-mode-dependent features.

---

## SECTION 11: SOS FLOATING BALL — Signature Feature

This is the most complex and most critical UI element in YatraX. It must be accessible from every page, always visible, and provide emergency SOS through intuitive touch gestures.

### Visual Design — Idle State

Shape: Perfect circle
Size: Dynamic based on theme — 48px (safe), 56px (caution), 64px (danger), calculated as calc(48px * var(--sos-scale))
Background: var(--theme-card-bg) — frosted glass
Backdrop-filter: blur(20px)
Border: 1px solid var(--theme-card-border)
Shadow: 0 4px 16px rgba(0,0,0,0.08) plus animated glow shadow from sos-pulse keyframe
Icon: Siren icon from Lucide, centered
Opacity: 0.85 at rest
Z-index: 50 (above everything except toasts)
Position: fixed
Cursor: grab (grabbing when dragging)
Animation: sos-pulse at var(--sos-pulse-speed) ease-in-out infinite

### Positioning Rules

Snaps ONLY to left or right edge of viewport (never top/bottom edge)
Can move vertically anywhere within bounds
Respects safe areas (top and bottom) plus 80px for bottom tab navigation
Edge padding: 8px from viewport edge
Default position: Right edge, 40% from top of viewport
Position persisted in localStorage key "safeguard-sos-position"
Spring snap animation on release (200ms ease-out)

### Interaction State Machine

#### State 1: Idle (Default)
Subtle pulse animation. Semi-transparent at 85%. Siren icon visible. No guides showing. Draggable.

#### State 2: Dragging
Opacity increases to 1.0. Scale increases to 1.05. Cursor changes to grabbing. No SOS logic during drag. On release: calculates nearest horizontal edge and snaps with spring animation.

#### State 3: Long Press (300ms hold without movement)
Triggered after 300ms of holding without drag movement exceeding 10px.
Heavy haptic feedback fires.
Ball expands to 1.3x scale.
Background dims slightly (overlay at 20% black opacity).
Guide arrows appear showing valid swipe directions:
- If ball is on RIGHT edge: show left arrow, up arrow, down arrow
- If ball is on LEFT edge: show right arrow, up arrow, down arrow
Text label appears below ball: "Swipe to trigger SOS"
Guide arrows animate with directional bounce (1s infinite loop).

#### State 4: Silent Pre-Alert (2-second hold without swiping)
If user holds for 2 full seconds without swiping while in long-press state:
POST /api/sos/pre-alert to backend silently.
Very subtle glow intensification (barely noticeable — user should NOT realize this happened).
No toast, no notification, no UI change.
Backend monitors the pre-alert and watches for escalation.
Purpose: If the tourist is scared or uncertain, the backend already knows something might be wrong.

#### State 5: Valid Swipe Detected — Countdown
Valid swipe conditions (ALL must be true):
- Long press state is active (after 300ms hold)
- Swipe distance >= 80px
- Horizontal swipe direction is TOWARD center of screen (right ball swipes left, left ball swipes right)
- Vertical swipes (up or down) are always valid regardless of ball side

When valid swipe detected:
Full-screen glassmorphism overlay appears (200ms fade-in).
Large morphing countdown number in center: 3, 2, 1.
Each number uses countdown-pop animation (400ms).
Heavy haptic on each tick.
Background pulses red, intensifying with each tick.
Prominent text: "TAP ANYWHERE TO CANCEL" pulsing below countdown.
If user taps anywhere: cancel, overlay fades out (200ms), ball returns to idle, light haptic.
If countdown completes without cancellation: SOS fires.

#### State 6: SOS Fired
POST /api/sos/trigger with: touristId, lat, lng, accuracy, timestamp, type "FULL_SOS", reverse-geocoded address, nearest station name and ETA.
Full-screen takeover replaces countdown:
- Large checkmark icon in emerald
- "SOS Sent" heading
- "Help is on the way" subtitle
- Emergency call button (tel:112) — large, prominent
- "Nearest police notified" with station name and ETA
- "I'm Safe Now" dismiss button (appears after 10 seconds, requires confirmation tap)
Heavy haptic success pattern.
Ball temporarily turns emerald, stops pulsing.

### Three-Tier Alert System
Tier 1 — Pre-Alert (Silent): 2-second hold, POST pre-alert, backend monitors, no dispatch, user not notified
Tier 2 — Full SOS (Dispatched): Swipe + countdown completes, POST trigger, emergency services dispatched, tourist profile shared with responders
Tier 3 — Offline SOS (Queued): No network detected, saved to localStorage queue, service worker background sync sends when restored, success screen shows "SOS saved. Will send when connection restored." with emergency call still available via tel: link

### Gesture Handler — Pure Functions
All gesture logic lives in pure functions (no React, no side effects) for testability:
- detectSwipeDirection(startX, startY, endX, endY, ballSide): returns 'horizontal' or 'vertical' or 'invalid'
- isValidSOSTrigger(longPressActive, swipeDirection, swipeDistance): returns boolean
- calculateSnapPosition(currentX, currentY, viewportWidth, viewportHeight, safeArea): returns {x, y, side}

---

## SECTION 12: APP STRUCTURE — 4 Tabs + Floating SOS

### Layout Hierarchy

```
<ErrorBoundary>
  <SessionProvider>
    <ThemeProvider>
      <GradientMeshBackground />
      <SOSProvider>
        <Onboarding />          ← First-launch overlay
        <Tabs>                    ← shadcn Tabs component
          <StatusBar />
          <TabsContent value="home">  <Home />  </TabsContent>
          <TabsContent value="map">   <Map />   </TabsContent>
          <TabsContent value="id">    <Identity /> </TabsContent>
          <TabsContent value="settings"> <Settings /> </TabsContent>
          <BottomNav />           ← 4 tabs, no center gap
        </Tabs>
        <SOSBall />               ← z-50, outside tab system, globally accessible
        <Toaster />               ← Toast notifications
      </SOSProvider>
    </ThemeProvider>
  </SessionProvider>
</ErrorBoundary>
```

### Bottom Navigation
Standard 4-tab layout: Home | Map | ID | Settings
No center gap (SOS is floating, not embedded in nav).
Each tab: flex-1, flex-col, centered icon (24px) + label (text-[10px] font-medium).
Active tab: text-primary, icon scales to 110%.
Inactive tab: text-muted-foreground.
Tab transition: 200ms color change.
Background: bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl, top border.
Height: auto with safe-area-bottom padding.

### Onboarding Overlay
First-launch onboarding renders above tabs inside UserLayout and blocks interaction until completed.
- Steps: splash (1.4s), permissions, feature slides, SOS tutorial, get started
- Permissions: geolocation + notifications (must resolve before continuing)
- Completion stored in localStorage key `yatrax:onboarding:v1`

---

## SECTION 13: HOME PAGE — Safety Dashboard

Composition-only root file, maximum 40 lines, zero logic. All data fetching, state management, and effects live in custom hooks (use-dashboard, use-location-share). All rendering lives in sub-components.

### Layout (Top to Bottom)

#### 1. Offline Banner (Conditional)
Only shows when navigator.onLine is false.
Amber background, WifiOff icon, white text.
"You're offline — some features may be unavailable"
Slides in from top, fades out when connection restored.

#### 2. Header
Left: Avatar (48px, rounded-full, border-2 border-primary/20) with AvatarFallback showing first initial.
Left text: "Welcome back," (text-sm font-medium) then first name (text-lg font-semibold).
Right: Notification bell icon (Bell from Lucide, 24px).
Bell has red badge circle (-top-1 -right-1, h-5 w-5, rounded-full, bg-red-500) showing unread count from notifications.
Tap opens Notification Center sheet.
Padding: p-4.

#### 3. Safety Score Hero Card (THE MOST IMPORTANT ELEMENT)
Glass Level 1. Full width minus 32px (16px padding each side). Minimum height 240px.

Contents from top to bottom inside card:

SVG Ring Progress:
- 160px diameter SVG centered
- Background ring: stroke on muted color, 12px stroke-width, 20% opacity
- Progress ring: stroke on var(--theme-primary), 12px stroke-width, round linecap
- Stroke-dasharray calculated from score percentage and circumference
- Ring starts from top (rotate -90deg)
- Inside the ring: large score number (text-4xl font-bold), smoothly morphing via requestAnimationFrame

"AI Safety Analysis" label: text-[10px] uppercase tracking-wider text-muted-foreground, centered below ring

Status Badge:
- Rounded-full, h-8, gap-2, text-sm font-semibold
- Score >= 80: bg-emerald-100 text-emerald-700 (dark: bg-emerald-900/40 text-emerald-300), green dot, "Low Risk"
- Score 50-79: bg-amber-100 text-amber-700 (dark: bg-amber-900/40), amber dot, "Moderate Risk"
- Score < 50: bg-red-100 text-red-700 (dark: bg-red-900/40), red dot, "High Risk"
- Dot: h-2 w-2 rounded-full in matching color

Progress Bar:
- Full width, h-2, rounded-full, bg-muted overflow-hidden
- Inner fill: bg-gradient-to-r from-primary to-primary/80, rounded-full, width as percentage
- Transition: width 1000ms ease-out
- Below bar: "{score}% Safe" right-aligned, text-xs text-muted-foreground

Factor Pills (horizontal scrollable badges):
- Container: relative div with fade edges (CSS mask-image or gradient overlays)
- Left fade: absolute inset-y-0 left-0 w-8 gradient from background to transparent
- Right fade: same on right side
- Inner: flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2
- Each pill: flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border shrink-0 snap-start
- Pill contents: emoji (text-sm), factor name (text-xs font-medium), trend icon
- Trend icons: ArrowUp (emerald) for improving, ArrowDown (red) for worsening, ArrowRight (slate) for stable

Description text: "Based on real-time location, crowd density, time, and historical data" — text-xs text-muted-foreground text-center, 2-3 lines

#### 4. Quick Actions (2-column grid)
grid grid-cols-2 gap-3 px-4

Two buttons: "Share Location" and "View Map"
Each button: flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 border border-border
Icon container: h-12 w-12 rounded-xl bg-primary/10, icon h-6 w-6 text-primary
Label: text-sm font-medium
Active state: active:scale-97 transition-all
Share Location uses Web Share API (navigator.share) with fallback to clipboard copy
View Map switches active tab to map

#### 5. Emergency Contacts Strip (ALWAYS VISIBLE — NOT COLLAPSIBLE)
Section title: "Emergency Contacts" (text-sm font-semibold mb-3)

Horizontal scroll container with snap:
- flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar
- CSS mask-image edge fades on left and right (gradient to transparent)

5 contact cards:
- Police: number 100, blue icon container, Shield icon
- Ambulance: number 108, rose icon container, Cross icon
- Fire: number 101, orange icon container, Flame icon
- Women Helpline: number 181, purple icon container, Heart icon
- Tourist Helpline: number 1363, emerald icon container, Luggage icon

Each card:
- a tag with href="tel:{number}"
- flex flex-col items-center gap-2 p-4 min-w-[100px] rounded-2xl bg-muted/30 border border-border
- Icon container: h-12 w-12 rounded-xl, color varies per contact
- Name: text-xs font-medium text-center
- Number: text-[10px] text-muted-foreground
- Active state: active:scale-95 transition-all
- Haptic feedback on tap

#### 6. Alert List (Compact List Rows — NOT Cards)
Section title: "Recent Alerts" (text-sm font-semibold mb-3)
Maximum 3 visible. "View All" button opens shadcn Sheet
*(Continuing from Section 13: Home Page — Alert List)*

Each alert row layout:
- Full width button (for tap interaction)
- flex items-start gap-3 py-3 text-left
- hover:bg-muted/30 rounded-lg transition-colors

Alert row contents:
- Left: colored dot (h-2 w-2 rounded-full mt-1.5 shrink-0). High severity: bg-red-500. Medium: bg-amber-500. Low: bg-emerald-500.
- Center: flex-1 min-w-0. Title (text-sm font-medium truncate). Message (text-xs text-muted-foreground truncate, single line).
- Right: relative time (text-[10px] text-muted-foreground whitespace-nowrap). Examples: "2m ago", "15m ago", "1h ago", "3h ago"

Alert row interaction:
- Tap opens Alert Detail sheet with full message, severity, timestamp, and action to focus on the alert location in Map.

Between rows: shadcn Separator component (thin horizontal line)
After 3rd row: no separator

"View All" button:
- Only shows if alerts.length > 3
- w-full mt-2 py-2 text-sm text-primary font-medium hover:underline
- Opens shadcn Sheet from bottom showing full alert list with scroll
- Sheet header: "All Alerts ({count})" with filter chips for severity
- Sheet content: same row format but scrollable, all alerts shown

Empty state (no alerts):
- Centered content: CheckCircle icon (48px, text-emerald-500)
- "No Active Alerts" heading (text-sm font-semibold)
- "Your area is currently clear" description (text-xs text-muted-foreground)

#### Notification Center Sheet (Triggered by Bell)
Opens a shadcn Sheet from bottom. Shows full notification list with read/unread states.
- Header: "Notifications" with "Mark all read" action
- Each item: title, message, type badge, timestamp; unread rows have stronger text and a dot indicator
- Tapping a notification marks it read; dismiss action is optional

#### 7. Daily Tip (Glass Level 3)
Single card, static content. Random tip selected on component mount using seeded random (based on date so it changes daily but not on every render). NOT rotating, NOT auto-advancing.

Layout:
- Glass Level 3 card (bg-white/30 backdrop-blur-12 rounded-xl)
- p-4
- flex items-start gap-3
- Left: icon container h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40, Lightbulb icon h-5 w-5 text-amber-600
- Right: flex-1
  - Title: "Safety Tip" (text-sm font-semibold mb-1)
  - Tip text: text-xs text-muted-foreground leading-relaxed

Tip pool (at least 10 tips):
1. "Always inform someone of your travel plans and expected return time."
2. "Keep emergency contacts saved and accessible even without internet."
3. "Trust your instincts — if something feels wrong, seek help immediately."
4. "Download offline maps before traveling to remote areas."
5. "Carry a portable charger to ensure your phone stays powered."
6. "Register with local tourist offices when visiting new regions."
7. "Keep copies of important documents separate from originals."
8. "Learn basic phrases in the local language for emergencies."
9. "Avoid displaying expensive jewelry or electronics in crowded areas."
10. "Stay on marked trails when exploring natural areas."

Bottom padding: pb-24 (to clear tab nav plus safe area)

### Home Page File Structure

```
src/pages/user/home/
├── Home.tsx                    ← Composition root (≤40 lines, zero logic)
├── types.ts                    ← DashboardData, Alert, Factor, SafetyStatus types
├── hooks/
│   ├── use-dashboard.ts        ← Fetch dashboard data, score animation, WebSocket alerts
│   ├── use-location-share.ts   ← Web Share API logic with clipboard fallback
│   └── use-notifications.ts    ← Notification list + read state
└── components/
    ├── home-header.tsx         ← Avatar + greeting + notification bell
    ├── safety-score-hero.tsx   ← Score ring + badge + progress + factors + description
    ├── safety-factor-pills.tsx ← Horizontal scrollable factor badges with trends
    ├── quick-actions.tsx       ← 2-col grid (Share Location, View Map)
    ├── emergency-strip.tsx     ← Horizontal scroll emergency contacts (always visible)
    ├── alert-list.tsx          ← Container with max 3 rows + View All
    ├── alert-list-item.tsx     ← Single alert row (memo'd for list performance)
    ├── alert-detail-sheet.tsx  ← Alert details + map focus action
    ├── notification-sheet.tsx  ← Notification Center sheet
    ├── daily-tip.tsx           ← Random tip glass card
    ├── empty-states.tsx        ← No alerts state, no score state
    └── offline-banner.tsx      ← Network lost banner
```

---

## SECTION 14: MAP PAGE — Interactive Safety Map

Full-screen Leaflet map with extensive safety intelligence overlays. Every feature must work flawlessly on mobile touch interactions. NO local SOS button on this page (removed per spec — global floating SOS ball handles emergency).

### Visual Hierarchy (Layers from Back to Front)

Layer 0 (z-0): Leaflet map container with tile layer (OpenStreetMap light or CartoDB Dark Matter)
Layer 1 (z-auto via Leaflet): Risk zone circles, route polylines, markers
Layer 2 (z-999): Route info panel overlay or active navigation header
Layer 3 (z-1000): Search bar, stats pill, map controls, compass, bottom cards, offline banner
Layer 4 (z-1001): Offline banner (above everything on map)

### Map Container Configuration
- Center: [26.1445, 91.7362] (Guwahati, Assam)
- Default zoom: 13
- Min zoom: 8
- Max zoom: 18
- scrollWheelZoom: enabled
- zoomControl: false (custom controls)
- Full height and width of parent container

### Tile Layers
Light mode: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png with OSM attribution
Dark mode: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png with CARTO + OSM attribution
Switching: Automatic based on dark mode class on html element, detected via MutationObserver

### Feature 1: Search Bar
Position: Absolute, top 16px, left 16px, right 16px, z-1000
Height: 56px (h-14)
Style: bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl rounded-2xl border-0
Input: pl-12 (space for search icon) pr-12 (space for clear/loader) text-base
Search icon: absolute left-4, centered vertically, h-5 w-5, text-muted-foreground
Clear button: absolute right-4, centered vertically, p-1 rounded-full hover:bg-slate-100, X icon h-5 w-5, only shows when query non-empty and not loading
Loading spinner: absolute right-4, centered vertically, Loader2 h-5 w-5 animate-spin text-primary, only shows during API call
Aria-label: "Search map locations"

Search behavior:
- 400ms debounce before API call (previous timer cleared on each keystroke)
- AbortController cancels in-flight requests when new search starts
- Minimum 2 characters before searching
- Nominatim API with query suffixed ", Assam, India" for regional relevance
- Limit: 6 results
- Results parsed: display_name split by comma taking first 3 parts, plus lat/lon/type

Results dropdown:
- Card below search bar, mt-2, shadow-xl border-0 rounded-2xl
- bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
- max-h-[300px] overflow-auto
- No padding on CardContent (p-0)

Each result item:
- Full width button, flex items-center gap-3 p-4
- hover:bg-slate-50 dark:hover:bg-slate-800
- active:bg-slate-100 dark:active:bg-slate-700
- text-left
- border-b border-slate-100 dark:border-slate-800 last:border-0
- Left: icon container 40x40 rounded-xl bg-primary/10, MapPin icon h-5 w-5 text-primary
- Center: flex-1 min-w-0, name (text-sm font-medium truncate), address if available (text-xs text-muted-foreground truncate)
- Right: ChevronRight h-4 w-4 text-muted-foreground shrink-0

On result selection:
- Haptic feedback (light)
- Map flies to selected coordinates at zoom 15 with 1.5s duration
- Destination is set (triggers route calculation)
- Results close, query clears
- Outside click closes results (mousedown event listener on document)
- Cleanup: debounce timer and AbortController cleared on unmount

### Feature 2: Stats Pill
Position: Absolute, top 76px (below search), horizontally centered (left-1/2 -translate-x-1/2), z-1000
Style: pill-shaped flex row, px-4 py-2.5 rounded-full shadow-lg
Background: bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800
Active state: active:scale-95 transition-all

Contents (left to right):
- If user in zone: red section with AlertCircle icon h-4 w-4 text-red-600, zone name truncated max-w-24 text-xs font-semibold, bordered right (border-r border-red-200)
- Zone count: AlertTriangle h-4 w-4 text-amber-500, number text-xs font-medium
- Station count: Shield h-4 w-4 text-blue-500, number text-xs font-medium
- Hospital count: Cross h-4 w-4 text-rose-500, number text-xs font-medium
- Layers icon: Layers h-4 w-4 text-muted-foreground (indicates tappable)

In-zone state: bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800
Tap: Opens Layers Sheet from bottom
Aria-label: "Open map layers and filters"

### Feature 3: Map Controls (Right Column)
Position: Absolute, bottom 144px, right 16px, z-1000
Layout: flex flex-col gap-2 (stacked vertically)

Four buttons from top to bottom:

Compass button:
- h-11 w-11 rounded-xl shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-0
- Navigation icon h-5 w-5
- Icon color: text-slate-600 dark:text-slate-300 normally, text-primary when bearing ≠ 0
- Icon rotated via inline style transform rotate({bearing}deg)
- transition-transform duration-300 on icon
- Tap: Resets map bearing to 0 (north), haptic feedback
- Aria-label: "Reset map north"

Zoom in button:
- Same dimensions and style as compass
- ZoomIn icon h-5 w-5
- Tap: map.zoomIn()
- Aria-label: "Zoom in"

Zoom out button:
- Same dimensions and style
- ZoomOut icon h-5 w-5
- Tap: map.zoomOut()
- Aria-label: "Zoom out"

Locate button:
- Same dimensions and style
- Normal state: LocateFixed icon h-5 w-5 text-primary
- Loading state: Loader2 icon h-5 w-5 animate-spin text-primary
- Disabled while locating
- Tap: Gets current position, flies map to it, posts location to backend
- Aria-label: "Center on my location"

### Feature 4: Risk Zone Circles
Each zone from data rendered as Leaflet Circle component.
Center: [zone.centerLat, zone.centerLng]
Radius: zone.radiusMeters

Path options by risk level:
- High: color #dc2626, fillColor #dc2626, fillOpacity 0.12, weight 2
- Medium: color #ea580c, fillColor #ea580c, fillOpacity 0.12, weight 2
- Low: color #ca8a04, fillColor #ca8a04, fillOpacity 0.12, weight 2

Tooltip: Leaflet Tooltip component, direction "center", not permanent. Shows "{name} · {level} Risk" in text-xs font-medium.
Click handler: Opens Zone Dialog with that zone's data.

### Feature 5: Police Station Markers
Leaflet Marker with custom DivIcon.
Icon design: bg-blue-600 p-1.5 rounded-full border-2 border-white shadow-lg, white shield SVG inside (14x14). Total icon size 28x28, anchor at center (14,14).

Popup content (glassmorphism styled via CSS overrides on .leaflet-popup-content-wrapper):
- p-2 min-w-[200px]
- Row 1: Shield icon h-4 w-4 text-blue-600 + station name h3 font-bold text-sm
- Row 2: Phone icon h-3 w-3 + contact number, text-xs text-muted-foreground
- Row 3 (if ETA available): Clock icon h-3 w-3 + ETA string, text-xs text-muted-foreground
- Row 4 (if distance available): MapPin icon h-3 w-3 + formatted distance, text-xs text-muted-foreground
- Row 5: Badge showing Active/Inactive status (text-[10px] h-5)
- Row 6: flex gap-2 with Call button (tel: link, primary, full width flex-1) and Route button (outline, opens Google Maps external)

### Feature 6: Hospital Markers
Leaflet Marker with custom DivIcon.
Icon design: bg-rose-600 p-1.5 rounded-full border-2 border-white shadow-lg, white cross SVG inside. Total 28x28, anchor center.

Popup: Same layout as police station plus:
- Hospital type badge (hospital/clinic/pharmacy) in secondary variant, capitalize, text-[10px] h-5
- Emergency badge in destructive variant if hospital.emergency is true

### Feature 7: User Location Marker
Custom DivIcon with multiple visual layers:
- Outermost: ping animation ring, absolute -inset-3, bg-blue-500 rounded-full animate-ping opacity-20
- Middle: static glow ring, absolute -inset-1.5, bg-blue-400 rounded-full opacity-30
- Core: bg-blue-600 p-2 rounded-full border-[3px] border-white shadow-xl
- Inner dot: w-3 h-3 bg-white rounded-full centered in core
- Heading arrow (conditional, only when heading is not null): small triangle above core, rotated to heading degrees. Triangle: border-left 5px transparent, border-right 5px transparent, border-bottom 8px blue-600.

Total icon size: 36x36, anchor center (18,18).
Icon is recreated via useMemo when heading changes (new DivIcon instance).

Accuracy ring (conditional):
- Shows only when accuracy > 15 meters
- Leaflet Circle component at user position
- Radius equals accuracy value in meters
- Style: color #3b82f6, fillColor #3b82f6, fillOpacity 0.06, weight 1, dashArray "4 4"
- Disappears automatically when GPS accuracy improves below threshold

Popup content:
- p-3 text-center min-w-[160px]
- Navigation icon h-5 w-5 text-blue-600 + "Your Location" text-sm font-semibold
- Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)} text-xs text-muted-foreground
- If accuracy available: ±{rounded accuracy}m accuracy, text-[10px]
- If speed available and > 0: {speed * 3.6 toFixed(1)} km/h, text-[10px]

### Feature 8: Destination Marker
Custom DivIcon.
Icon design: bg-emerald-500 p-2 rounded-full border-2 border-white shadow-lg, white map pin SVG inside (16x16).
Total: 32x32, anchor at bottom center (16,32) so pin points to exact location.

Popup content:
- p-3 min-w-[180px]
- Target icon h-5 w-5 text-emerald-600 + "Destination" text-sm font-semibold
- Destination name text-xs text-muted-foreground mb-3
- flex gap-2: Navigate button (Car icon, primary, flex-1) opens Google Maps. Clear button (X icon, outline) removes destination.

### Feature 9: Safe Route Lines
Three polylines rendered when destination is set and routes are calculated.

Safest route:
- Color: #10b981 (emerald-500)
- Weight: 5px
- Opacity: 0.8
- No dash (solid line)
- lineCap: round, lineJoin: round
- Tooltip: "Safest · {score}/100 · {distance}"

Fastest route (only if different from safest):
- Color: #3b82f6 (blue-500)
- Weight: 4px
- Opacity: 0.6
- dashArray: "10 10"
- Tooltip: "Fastest · {distance}"

Alternative route:
- Color: #94a3b8 (slate-400)
- Weight: 3px
- Opacity: 0.4
- dashArray: "8 8"
- Tooltip: "Alt · Score {score} · {distance}"

Tooltips: Leaflet Tooltip component, sticky (follows cursor), direction "top", offset [0, -10], text-xs font-medium.

### Feature 10: Route Info Panel
Position: Absolute, top 120px, left 16px, right 16px, z-999
Condition: Only visible when destination is set AND routes are calculated AND not loading AND layer visibility for routes is on
Style: Card shadow-lg border-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg overflow-hidden

Contents:
- Header: "ROUTE COMPARISON" text-[10px] font-semibold text-muted-foreground uppercase tracking-wider
- List of route rows (one per route)

Each route row:
- flex items-center gap-2 p-2 rounded-lg text-xs
- Safest: bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800
- Fastest (not safest): bg-blue-50 dark:bg-blue-950/30 border border-blue-200
- Alternative: bg-muted/30 border border-transparent
- Left icon: CheckCircle for safest (emerald), Zap for fastest (blue), MapPin for alternative (muted)
- Label: "Safest", "Fastest", or "Alternative" (font-medium truncate)
- Right cluster (ml-auto shrink-0): Safety score badge (color-coded), distance, duration in minutes, warning triangle if high-risk intersections > 0

Safety badge colors in route rows:
- Score >= 80: bg-emerald-100 text-emerald-700
- Score 50-79: bg-amber-100 text-amber-700
- Score < 50: bg-red-100 text-red-700

### Feature 10a: Navigation Header (Active Navigation)
Condition: Only visible when destination is set, safest route is active, and routes are not loading.
Position: Absolute, top 120px, left 16px, right 16px, z-999 (same slot as Route Info Panel; header replaces it while navigating).
Contents:
- Left icon container (emerald). MapPin icon normally, CheckCircle when arrived.
- Title: "Active Navigation" or "Arrived" with short helper text.
- Badges: ETA (minutes), distance remaining, and safety score when available.
- Arrival state: "Dismiss" button and small advisory strip.

Navigation thresholds:
- Deviation: user is > 60m from safest route.
- Arrival: user is within 30m of destination.

### Feature 10b: Route Deviation Alert
Condition: Visible when deviation threshold is met and active navigation is true.
Position: Absolute, bottom 208px-ish (above bottom cards), left 16px, right 16px, z-1001.
Style: red-tinted glass card with warning icon.
Actions:
- "Recalc" button triggers route recalculation.
- Dismiss button hides the alert until the next deviation.

### Feature 11: Destination Bar (Bottom Card)
Position: Absolute, bottom 144px, left 16px, right 16px, z-1000
Condition: Shows when destination is selected (mutually exclusive with nearest station bar)
Style: Card shadow-xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl

Contents:
- Top row: flex items-center gap-3
  - Emerald icon container 40x40 rounded-xl bg-emerald-100 dark:bg-emerald-900/40, Target icon
  - Destination name (text-sm font-medium truncate) and "Destination" label (text-xs muted)
  - Navigate button: h-9 bg-emerald-500 hover:bg-emerald-600, ExternalLink icon + "Navigate" text, opens Google Maps
  - Clear button: size-icon ghost h-9 w-9, X icon

- Bottom row (when routes calculated): flex items-center gap-2 flex-wrap
  - Safety badge: CheckCircle + "Safety: {score}/100" in emerald
  - Distance badge: MapPin + formatted distance
  - Duration badge: Clock + minutes
  - Risk warning badge (if high intersections > 0): AlertTriangle + "{count} high risk" in destructive

- Loading state: Loader2 animate-spin + "Calculating safe routes..." text-xs text-muted-foreground

### Feature 12: Nearest Station Bar (Bottom Card)
Position: Same as destination bar (mutually exclusive)
Condition: Shows when NO destination set AND user position exists AND nearest station calculated
Style: Same glassmorphism card

Contents: flex items-center gap-3 p-3
- Blue icon container 40x40 rounded-xl bg-blue-100 dark:bg-blue-900/40, Shield icon
- "Nearest Police Station" label (text-xs muted)
- Station name (text-sm font-medium truncate)
- ETA (text-[10px] muted, Clock icon) and distance (text-[10px] muted, MapPin icon) row below name
- Call button: a href tel:, Button size-sm variant-outline h-9 gap-1.5, Phone icon

### Feature 13: Nearest Hospital Bar
Position: Above the station/destination bar (bottom 208px approximately), left 16px, right 16px, z-999
Condition: Shows when user position exists AND hospital layer visible AND no destination set
Style: Slightly less prominent — Card shadow-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg

Contents: flex items-center gap-2.5 p-2.5
- Rose icon container 36x36 rounded-lg bg-rose-100 dark:bg-rose-900/40, Cross icon h-4 w-4
- "Nearest Hospital" label (text-[10px] muted)
- Hospital name (text-xs font-medium truncate)
- ETA (driving, text-[10px]) and distance (text-[10px]) row
- Call button: h-8 text-[10px], Phone icon

### Feature 14: Layers Sheet
Trigger: Tapping stats pill
Type: shadcn Sheet, side "bottom"
Style: rounded-t-3xl h-auto max-h-[70vh] pb-8
Has SheetHeader with SheetTitle and SheetDescription

Sections from top to bottom:

Zone Warning (conditional — only when user is in a risk zone):
- flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900
- AlertCircle icon h-5 w-5 text-red-600 shrink-0
- "You're in a Risk Zone" heading font-semibold text-red-900
- Zone name if available: "Currently in: {name}" text-sm text-red-700

Separator between sections

Risk Level Filter:
- Label: "Risk Level Filter" text-sm font-semibold mb-3
- Flex wrap gap-2 of pill buttons
- Options: "All Zones ({count})", "High Risk", "Medium Risk", "Low Risk"
- Active button: colored background matching risk (red/amber/yellow) with white text
- Inactive: outline variant
- All buttons: rounded-full capitalize h-10 px-4
- Haptic feedback on tap

Separator

Show on Map (Layer Toggles):
- Label: "Show on Map" text-sm font-semibold mb-3
- 3-column grid, gap-3
- Zones button: h-14 rounded-xl gap-1 flex-col text-xs. Active: bg-amber-500 text-white. AlertTriangle icon + "Zones"
- Police button: Active: bg-blue-500. Shield icon + "Police"
- Hospitals button: Active: bg-rose-500. Cross icon + "Hospitals"

Route Display:
- Label: "Route Display" text-sm font-semibold mb-3
- Single full-width button: w-full h-12 rounded-xl gap-2
- Active: bg-emerald-500 text-white. MapIcon + "Show Safe Routes"

Separator

Map Style (read-only info):
- Label: "Map Style" text-sm font-semibold mb-3
- Info row: p-3 rounded-xl bg-muted/50
- Sun or Moon icon based on dark mode
- "Light (OpenStreetMap)" or "Dark (CartoDB Dark Matter)"
- "Follows app theme" text-xs text-muted-foreground ml-auto

Separator

Legend:
- Label: "Legend" text-sm font-semibold mb-3
- 2-column grid, gap-3
- Each item: flex items-center gap-2 p-3 rounded-xl bg-muted/50
- Items: High Risk (red circle), Medium Risk (amber circle), Low Risk (yellow circle), Police with count (Shield icon blue), Hospital with count (Cross icon rose), Safest Route (solid emerald line), Fastest Route (dashed blue line), You (blue dot with white border)

### Feature 15: Zone Dialog
Trigger: Clicking any risk zone circle
Type: shadcn Dialog (centered modal)
Style: rounded-3xl max-w-sm mx-4

Contents:
- DialogHeader with DialogTitle: AlertTriangle icon (colored by risk level) + zone name
- DialogDescription: "Risk zone details and safety information"
- Badge: "{level} Risk Zone" colored by level (emerald/amber/red backgrounds with matching text)
- Description text: zone.description or default "Stay alert and exercise caution in this area. Keep emergency contacts accessible."
- Info rows:
  - MapPin icon + "Radius: {km} km"
  - Navigation icon + "{distance} from you · {ETA}" (only if user position available)
  - Shield icon text-blue-500 + "Nearest: {station name}" with Clock icon and ETA (only if nearest station available)
- Action buttons: flex gap-2
  - "View on Map" button: primary, flex-1, Navigation icon. Flies map to zone center then closes dialog.
  - "Close" button: outline variant

### Feature 16: Offline Map Banner
Position: Absolute, top 80px (below search, overlapping stats area), left 16px, right 16px, z-1001
Condition: navigator.onLine is false
Style: flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-lg shadow-lg

Contents: WifiOff icon h-4 w-4 text-white + "You're offline — Map data may be outdated. SOS still available." text-xs font-medium text-white

### Feature 17: Map Loading Skeleton
Condition: Shows during initial map and data loading
Style: fixed inset-0, flex items-center justify-center, bg-background/80 backdrop-blur-sm, z-50

Contents: centered glass card (bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-3xl p-8)
- Map icon h-12 w-12 text-primary/30 with Loader2 h-6 w-6 text-primary animate-spin overlaid at center
- "Loading Map" text-sm font-semibold
- "Fetching safety data..." text-xs text-muted-foreground

### Feature 18: Geofence Alert System
Runs on every GPS position update from watchPosition.

Logic:
- Maintain a Set of zone IDs the user is currently inside (prevZonesRef)
- On each position update, calculate distance from user to each zone center
- If distance <= zone.radiusMeters, add zone ID to current set
- Compare current set with previous set:
  - Zone ID in current but NOT in previous = ENTERED zone
    - Heavy haptic feedback
    - Toast warning: "Entered risk zone: {name}" with description "{level} risk — Stay alert", duration 5000ms
  - Zone ID in previous but NOT in current = LEFT zone
    - Light haptic feedback  
    - Toast success: "You've left the risk zone", duration 3000ms
- Update previous set to current set

### Feature 19: Continuous GPS Tracking
Uses navigator.geolocation.watchPosition instead of one-shot getCurrentPosition.
Options: enableHighAccuracy true, maximumAge 5000ms (accept 5-second-old position), timeout 15000ms

Updates on each position callback:
- userPosition state
- accuracy state (pos.coords.accuracy)
- heading state (pos.coords.heading, may be null)
- speed state (pos.coords.speed, may be null)

Throttled backend post: Every 15 seconds maximum, POST location to /api/tourist/{id}/location with lat, lng. Uses Date.now() comparison with last post timestamp.

Cleanup: clearWatch on component unmount via useEffect return.

### Feature 20: Dark Mode Detection for Map
MutationObserver watches document.documentElement for class attribute changes.
When .dark class is added or removed, isDarkMode state updates.
This drives tile URL selection between OpenStreetMap and CartoDB Dark Matter.

### Safe Route Algorithm (Current Implementation)

Step 1 — Generate 3 alternative routes:
Since Google Directions API is not yet integrated, routes are generated locally:
- Direct route: 30 interpolated points between start and end
- North variant: 15 points from start to midpoint offset north, then 15 points to end
- South variant: 15 points from start to midpoint offset south, then 15 points to end
- Offset magnitude: 15% of the greater of latitude or longitude delta

Step 2 — Score each route:
For each point on each route:
- Calculate distance to every risk zone center
- If point is inside zone (distance <= radius): increment counter for that zone's risk level
- Calculate distance to every police station
- If station is within 500m: increment police counter

Score formula:
```
score = 100
      - (highRiskIntersections × 30)
      - (mediumRiskIntersections × 15)
      - (lowRiskIntersections × 5)
      + (policeNearby × 10)
Clamped to [0, 100]
```

Step 3 — Calculate distance and duration:
- Distance: sum of Leaflet distanceTo between consecutive points
- Duration: distance / walking speed (1.39 m/s = 5 km/h)

Step 4 — Rank:
- Highest safety score: isSafest = true
- Shortest distance: isFastest = true
- (May be same route for both)

Future: Replace route generation with Google Directions API returning real road polylines with alternatives:true. Decode encoded polylines to lat/lng arrays. Apply same scoring algorithm to real road points.

### Distance and ETA Utilities

formatDistance(meters):
- Under 1000m: "{rounded}m" (e.g., "650m")
- 1000m and above: "{km.toFixed(1)}km" (e.g., "1.2km")

formatETA(meters, mode):
- Walking: 5 km/h
- Driving: 30 km/h
- Under 1 minute: "< 1 min"
- Under 60 minutes: "{minutes} min {mode}" (e.g., "12 min walk")
- 60+ minutes: "{hours}h {minutes}m {mode}" (e.g., "1h 15m drive")

### Leaflet CSS Overrides (Added to index.css)

Popup glassmorphism:
- .leaflet-popup-content-wrapper: bg white/92, backdrop-blur 16px, rounded 1rem, shadow, subtle border
- .dark variant: bg slate-950/92, white/6 border, white text
- .leaflet-popup-tip: matching background color
- .leaflet-popup-close-button: muted foreground color, 20px font size, 6px 8px padding

Tooltip glassmorphism:
- .leaflet-tooltip: bg white/92, backdrop-blur 12px, rounded 0.75rem, subtle border and shadow, 12px font, 6px 12px padding
- .dark variant: dark background and border
- .leaflet-tooltip-top::before: matching border color

Attribution minimal:
- .leaflet-control-attribution: 9px font, bg white/70, backdrop-blur 4px, rounded 8px, 2px 6px padding
- .dark variant: dark background, muted text and link colors

Dark mode tile filter:
- .dark .leaflet-tile-pane: filter brightness(0.95) contrast(1.05)

User marker ping animation:
- @keyframes marker-ping matching the animation used in the UserIcon DivIcon

Print styles:
- .leaflet-control-container and .leaflet-popup-pane: display none

### Map File Structure

```
src/pages/user/map/
├── Map.tsx                     ← Composition root (≤60 lines, zero logic)
├── types.ts                    ← RiskZone, PoliceStation, Hospital, Destination,
│                                  SearchResult, SafeRoute, RouteInfo, RiskFilter,
│                                  LayerVisibility, MapViewState, getZoneColor,
│                                  formatDistance, formatETA, getZoneRiskWeight
├── constants.ts                ← MAP_DEFAULTS, TILE_URLS, TILE_ATTRIBUTIONS,
│                                  SEARCH_DEBOUNCE_MS, LOCATION_POST_INTERVAL_MS,
│                                  SAFE_ROUTE_WEIGHTS, WALKING_SPEED_MS,
│                                  DRIVING_SPEED_MS, ROUTE_INTERPOLATION_STEPS,
│                                  POLICE_PROXIMITY_RADIUS_M
├── hooks/
│   ├── use-map-data.ts         ← GPS tracking, zones, stations, hospitals,
│   │                              geofence alerts, dark mode, online/offline,
│   │                              nearest station/hospital, layer state,
│   │                              backend data fetch, locate handler
│   ├── use-map-navigation.ts   ← Destination state, route generation,
│                                  safe route scoring, route ranking
│   └── use-navigation.ts        ← Active navigation, deviation + arrival detection
└── components/
    ├── map-icons.ts            ← DefaultIcon, PoliceIcon, HospitalIcon,
    │                              createUserIcon(heading), DestinationIcon
    ├── fly-to-location.tsx     ← useMap().flyTo on position change
    ├── search-control.tsx      ← Debounced search with abort, results dropdown
    ├── stats-pill.tsx          ← Zone/station/hospital/inZone indicator
    ├── map-controls.tsx        ← Compass, zoom in, zoom out, locate
    ├── map-view.tsx            ← Leaflet map container and base layers
    ├── map-overlays.tsx        ← Overlays wrapper (route info, headers, banners)
    ├── zone-overlay.tsx        ← Risk zone Circle components with tooltips
    ├── station-markers.tsx     ← Police Marker components with rich popups
    ├── hospital-markers.tsx    ← Hospital Marker components with rich popups
    ├── user-marker.tsx         ← GPS dot + accuracy Circle + heading arrow
    ├── destination-marker.tsx  ← Destination pin with navigate/clear popup
    ├── route-lines.tsx         ← Safest/fastest/alternative Polylines
    ├── route-info-panel.tsx    ← Route comparison overlay card
    ├── navigation-header.tsx   ← Active navigation header + arrival state
    ├── route-deviation-alert.tsx ← Deviation warning + recalc CTA
    ├── bottom-cards.tsx        ← DestinationBar, NearestStationBar,
    │                              NearestHospitalBar (3 exported components)
    ├── layers-sheet.tsx        ← Full layer control Sheet from bottom
    ├── zone-dialog.tsx         ← Zone detail Dialog with distance info
    ├── offline-map-banner.tsx  ← Offline warning strip
    └── map-loading.tsx         ← Loading skeleton overlay
```

---

## SECTION 15: IDENTITY PAGE — Digital Tourist ID

### Visual Concept
Premium digital ID card that looks and feels like a real government-issued identity document. Credit card aesthetic meets Apple Wallet meets passport.

### Card Design Specifications

Aspect ratio: 1.586:1 (credit card standard — 85.6mm × 53.98mm)
Width: Full screen width minus 32px (16px padding each side)
Height: Calculated from aspect ratio (padding-bottom: 63.1%)
Corner radius: 16px (rounded-2xl)
3D perspective: 1000px
Flip animation: rotateY(180deg), 600ms cubic-bezier(0.4, 0, 0.2, 1)
Tap to flip between front (info) and back (QR code)
Both sides use backface-visibility: hidden

Holographic shimmer overlay on both sides:
- Absolute positioned covering entire card
- Linear gradient at 135deg with transparent bands and white/10-15 bands
- background-size 200% 200%
- Animated: holo-shift keyframe, 6s ease-in-out infinite
- pointer-events: none, z-index 10, border-radius: inherit

Light mode card background: Theme-colored gradient (emerald to teal)
Dark mode card background: Premium black finish (slate-950 to slate-900, subtle dark gradient)
Danger state: Card border glows red subtly (box-shadow with red theme-glow)

### Card Front Layout

Top row: "YatraX" logo text (left) + country flag emoji (right)
Below logo: "TOURIST IDENTITY CARD" in text-[10px] uppercase tracking-wider, white/70

Main content area:
- Left: Photo (64x64 rounded-lg, border 2px white/20). If no photo: initials avatar with themed background.
- Right of photo:
  - Name: text-lg font-bold text-white
  - Tourist ID: text-xs text-white/70 (format: YTX-{YEAR}-{STATE_CODE}-{6_DIGIT_NUMBER})
  - Country with flag: text-sm text-white/80

Bottom area:
- Two columns:
  - "VALID FROM" label (text-[9px] uppercase white/50) + date (text-sm white)
  - "VALID UNTIL" label + date
- Verified badge (bottom-left): Small green dot (h-2 w-2 rounded-full bg-emerald-400) + "VERIFIED" text-[10px] uppercase. Only shown if profile is complete.

### Card Back Layout

Top: "EMERGENCY INFORMATION" in text-[10px] uppercase tracking-wider

Center: QR Code
- 160x160px centered
- White background with 8px padding, rounded-lg
- Generated with qrcode.react QRCodeSVG component
- Center logo overlay: small YatraX icon 32x32
- QR data: https://yatrax.app/id/{touristId}?emergency=true
- This URL shows emergency info to anyone who scans without authentication

Below QR:
- "EMERGENCY CONTACT" label + phone number
- Two columns: "BLOOD TYPE" + value, "ALLERGIES" + value
- Bottom: "Scan QR for full emergency profile" text-[9px] text-white/50

### Quick Actions Below Card

Three buttons below the card (outside the flip container):
- Row 1 (2-col grid): "Share ID" (Share2 icon) + "Download PDF" (Download icon)
- Row 2 (full width): "View Full Details" (ClipboardList icon)

Share ID: Uses navigator.share() Web Share API, falls back to clipboard.writeText()
Download PDF: Future feature — generates printable A4 PDF with card front/back
View Full Details: Opens shadcn Sheet from bottom showing all profile fields in labeled rows

### Empty State (No ID Created)
Centered in page:
- Large CreditCard icon (64px, text-muted-foreground/30)
- "Create Your Digital Tourist ID" heading (text-lg font-semibold)
- "Your digital identity card for safe travel in Assam. It helps emergency services identify and assist you." description (text-sm text-muted-foreground, max-w-xs, text-center)
- "Get Started" primary button (full width, h-12)

### Identity File Structure

```
src/pages/user/ID/
├── Identity.tsx                ← Composition root
├── types.ts                    ← TouristProfile, IDCardData interfaces
├── hooks/
│   └── use-identity.ts         ← Profile fetch, flip state, share logic
└── components/
    ├── id-card.tsx             ← Outer container with flip state
    ├── id-card-front.tsx       ← Front face layout
    ├── id-card-back.tsx        ← Back face with QR
    ├── id-card-flip.tsx        ← CSS 3D transform wrapper
    ├── qr-code-display.tsx     ← QR generation with center logo
    ├── id-details-sheet.tsx    ← Full profile bottom sheet
    ├── id-skeleton.tsx         ← Loading skeleton matching card aspect ratio
    └── id-empty-state.tsx      ← CTA for creating ID
```

---

## SECTION 16: SETTINGS PAGE

### Visual Structure
Full scrollable page with grouped sections separated by subtle separators. Each section has a heading and contains settings items.
If the user is not authenticated, render the Auth screen instead of settings groups.

### Layout (Top to Bottom)

#### 1. Profile Header
- flex items-center gap-4 p-4
- Avatar: h-16 w-16 (64px), border-2 border-primary/20, AvatarFallback text-xl
- Name: text-lg font-semibold truncate
- Email: text-sm text-muted-foreground truncate
- Edit button: ghost variant, size-sm, "Edit" text + ChevronRight icon

#### 2. Theme Selector
Section heading: "APPEARANCE" text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3

shadcn ToggleGroup, type "single", value bound to theme preference:
- Light option: Sun icon h-4 w-4 + "Light" label, flex-1
- Dark option: Moon icon + "Dark", flex-1
- Auto option: Monitor icon + "Auto", flex-1

Below toggle group: "Switches automatically at 6 PM (dark) and 6 AM (light)" text-xs text-muted-foreground

#### 3. Notification Settings
Section heading: "NOTIFICATIONS"

4 toggle rows using Settings Item pattern:
- Push Notifications: Bell icon, blue icon bg. Switch control.
- Alert Sounds: Volume2 icon. Switch control.
- Vibration Feedback: Vibrate icon. Switch control.
- Quiet Hours (10PM-7AM): Moon icon. Switch control.

#### 4. Privacy Settings
Section heading: "PRIVACY & DATA"

3 toggle rows:
- Location Sharing: MapPin icon, emerald bg. Switch control. Description: "Share your location for safety monitoring"
- High Accuracy GPS: Target icon. Switch control. Description: "Uses more battery but improves safety"
- Anonymous Data Collection: BarChart icon. Switch control. Description: "Help improve safety data for all tourists"

#### 5. Emergency Profile
Section heading: "EMERGENCY INFO"

4 tap-to-edit rows:
- Emergency Contact: Phone icon, rose bg. Value shows phone number or "Not set". ChevronRight. Opens edit sheet.
- Blood Type: Droplets icon. Value shows type or "Not set". ChevronRight.
- Allergies: AlertTriangle icon. Value shows list or "None". ChevronRight.
- Medical Conditions: Heart icon. Value shows list or "None". ChevronRight.

#### 6. About
Section heading: "ABOUT"

4 rows:
- Version: Info icon. Value shows version string (e.g., "2.1.0"). No interaction.
- Terms of Service: FileText icon. ChevronRight. Opens external link.
- Privacy Policy: Lock icon. ChevronRight. Opens external link.
- Support: HelpCircle icon. ChevronRight. Opens email compose.

#### 7. Danger Zone
Separate visual section with danger styling:
- mx-4 p-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 space-y-3
- Section label: "Danger Zone" text-sm font-semibold text-red-900 dark:text-red-200

Two buttons:
- Sign Out: w-full, outline variant, border-red-300 text-red-600 hover:bg-red-50. LogOut icon.
- Delete Account: w-full, destructive variant. Trash2 icon. Tap opens confirmation dialog requiring typed confirmation.

### Settings Item Pattern (Reusable Component)

```
┌────────────────────────────────────────┐
│ [🔵] Label                      [═══] │  ← Switch variant
│      Description text                  │
├────────────────────────────────────────┤
│ [🔵] Label                   Value  > │  ← Navigate variant
│      Description text                  │
└────────────────────────────────────────┘
```

Each item: flex items-center justify-between py-4 px-4
Left: flex items-center gap-3 flex-1 min-w-0
- Icon container: h-10 w-10 rounded-xl bg-primary/10 shrink-0, icon h-5 w-5 text-primary
- Text: name (text-sm font-medium), description if exists (text-xs text-muted-foreground truncate)
Right: Switch component, or ChevronRight icon, or value text (text-sm text-muted-foreground)

### Settings File Structure

```
src/pages/user/settings/
├── Settings.tsx                    ← Composition root
├── types.ts                        ← SettingsState, NotificationPrefs, PrivacyPrefs
├── hooks/
│   ├── use-settings.ts             ← Settings composition (theme + profile + emergency)
│   ├── use-tourist-profile.ts      ← Profile fetch + normalization
│   ├── use-profile-editor.ts       ← Profile edit/submit helpers
│   └── use-emergency-editor.ts     ← Emergency info edit helpers
└── components/
    ├── settings-header.tsx         ← Profile card with avatar
    ├── settings-group.tsx          ← Section wrapper (heading + children)
    ├── settings-item.tsx           ← Reusable row (icon, label, switch/nav/value)
    ├── theme-selector.tsx          ← ToggleGroup for light/dark/auto
    ├── language-selector.tsx       ← Language picker (future, placeholder)
    ├── notification-settings.tsx   ← Push, sounds, vibration, quiet hours
    ├── privacy-settings.tsx        ← Location, accuracy, data collection
    ├── emergency-profile.tsx       ← Emergency contact, blood type, allergies, medical
    ├── logged-in-view.tsx          ← Logged-in settings view wrapper
    ├── edit-emergency-contact-sheet.tsx ← Edit emergency contact sheet
    ├── edit-blood-type-sheet.tsx   ← Edit blood type sheet
    ├── edit-allergies-sheet.tsx    ← Edit allergies sheet
    ├── edit-medical-sheet.tsx      ← Edit medical conditions sheet
    ├── message-toast.tsx           ← Settings status toast
    ├── about-section.tsx           ← Version, terms, privacy, support
    ├── danger-zone.tsx             ← Sign out, delete account with confirmation
    └── settings-skeleton.tsx       ← Loading skeleton
```

---

## SECTION 17: SAFETY SCORE — ML Pipeline

### Overview
The core intelligence of YatraX. A numerical score from 0 to 100, updated every 30 seconds or on significant location change (>100m movement). Higher scores mean safer conditions.

### 17a. Complete Safety Factor Taxonomy
147-153 Total Factors Across 16 Categories.

#### Category 1: Geographic & Terrain (13 factors, High Feasibility)
- **Elevation** (Google Elevation API / SRTM | Remote) - Risk: altitude sickness above 2,500m.
- **Slope/Gradient** (Elevation API | Remote) - Risk: steep terrain = fall risk/landslide.
- **Terrain Type** (OSM/Land use | Remote) - Unique risk profiles per type.
- **Distance to nearest road** (Google Places/OSM | Both) - Risk: harder evacuation.
- **Distance to nearest settlement** (Google Places/OSM | Remote) - Risk: isolation.
- **Flood zone proximity** (Government/NDMA/PostGIS | Both) - Critical for annual floods (Assam).
- **Landslide prone area** (Geological Survey of India | Remote) - High risk in NE India.
- **Earthquake zone** (Seismic zone maps | Both) - NE India is Zone V (highest).
- **River/water body proximity** (OSM/Google Hydrology | Both) - Drowning/flash floods.
- **River current season** (Central Water Comm. | Remote) - Deadly monsoon currents.
- **Vegetation density** (NDVI/GEE | Remote) - Harder to find lost tourists.
- **Trail condition** (OSM/tourism board | Remote) - Unmarked/abandoned trails.
- **Border proximity** (Govt maps | Remote) - Restricted zones/military borders.

#### Category 2: Weather & Climate (12 factors, High Feasibility)
- **Current temperature** (OpenWeather/IMD | Both) - Heatstroke >42°C, Hypothermia <5°C.
- **Rainfall intensity** (IMD/OpenWeather | Both) - Flash floods, landslides.
- **Flood warning status** (CWC/NDMA | Both) - Brahmaputra floods.
- **Visibility** (Weather/METAR | Both) - Fog/smog risks for driving.
- **Wind speed** (Weather API | Both) - High winds on bridges/passes.
- **Humidity** (Weather API | Both) - Exhaustion at >90%.
- **UV index** (Weather API | Remote) - Sunburn/dehydration.
- **Lightning probability** (Detection networks | Both) - Extremely high death rate in NE.
- **Cyclone/storm tracking** (IMD | Both) - Bay of Bengal impacts.
- **Seasonal risk profile** (Historical data | Both) - Monsoon/Fog/Heat.
- **Sunset/sunrise time** (Computed | Both) - Determines start of night context.
- **Feels-like temperature** (Computed | Both) - Health risk indicator.

#### Category 3: Wildlife & Nature Hazards (9 factors, Medium Feasibility)
- **Wildlife sanctuary proximity** (Protected area GIS | Remote) - Rhino/elephant/tiger conflict.
- **Elephant corridor proximity** (Wildlife Institute | Remote) - High attack rates.
- **Recent animal sighting reports** (Forest dept/News | Remote) - Dynamic tracking.
- **Snake density season** (Seasonal data | Remote) - Monsoon peak activity.
- **Insect/disease vector season** (Health dept/WHO | Remote) - Malaria, Dengue, JE.
- **Poisonous plant density** (Botanical survey | Remote) - Trekker hazards.
- **Leech season** (Seasonal data | Remote) - Panic/infection risk.
- **Water contamination risk** (Water quality tests | Remote) - Parasite risk.
- **Animal migration pattern** (Tracking data | Remote) - Floods force rhino movement.

#### Category 4: Infrastructure & Accessibility (15 factors, High Feasibility)
- **Distance to hospital** (Google Distance Matrix | Both) - Travel time.
- **Hospital level** (Health dept | Both) - PHC vs District capability.
- **Distance to police station** (Distance Matrix | Both) - Help ETA.
- **Police station type** (Backend | Both) - Outpost vs Tourist Police.
- **Road quality/type** (OSM/Google Roads | Both) - Dirt roads impassable in rain.
- **Road condition** (PWD/Google Traffic | Both) - Washed out/blocked.
- **Bridge status** (PWD/Local reports | Remote) - Seasonal washouts.
- **Fuel station proximity** (Google Places | Remote) - Stranded vehicle risk.
- **ATM/bank proximity** (Google Places | Remote) - Cash isolation.
- **Public restroom availability** (Google Places/OSM | Both) - Female tourist safety.
- **Street lighting** (VIIRS/OSM | Both) - Night crime proxy.
- **CCTV coverage** (Police data | City) - Crime deterrence.
- **Shelter availability** (Google Places/OSM | Remote) - Storm safety.
- **Helicopter landing accessibility** (Aviation/Terrain | Remote) - Air rescue capability.
- **Ferry/boat service availability** (Transport data | Remote) - Isolation (e.g., Majuli).

#### Category 5: Communication & Connectivity (7 factors, High Feasibility)
- **Mobile network coverage** (OpenSignal/TRAI | Both) - Help accessibility.
- **Network type available** (Device API | Both) - Data (5G/4G) vs Voice (2G).
- **Multiple carrier coverage** (TRAI | Remote) - Tower failure redundancy.
- **Satellite phone necessity** (Registration data | Remote) - Zero cell zones.
- **WiFi availability nearby** (Google Geolocation | Both) - Backup channel.
- **Emergency broadcast system reach** (Alert coverage | Both) - Warning reception.
- **Last known signal location** (Device cache | Remote) - Navigation back to connectivity.

#### Category 6: Human & Social Environment (16 factors, Medium Feasibility)
- **Population density** (Census/Places | Both) - Isolated vs crowded.
- **Tourist-to-local ratio** (Tourism board | Both) - Scam targeting metrics.
- **Crime rate** (NCRB/Police | City) - Baseline per 100k.
- **Crime type distribution** (NCRB/Police | City) - Theft vs Assault.
- **Tourist-targeted crime history** (Tourist Police | Both) - Specific hazard profiling.
- **Scam reports in area** (TripAdvisor/App data | Both) - Fraud risk.
- **Alcohol consumption patterns** (Places/Excise | Both) - Bar density + Time = Risk.
- **Local unrest/protest activity** (News/Social media | Both) - Bandhs/shutdowns.
- **Ethnic tension zones** (Govt advisories | Remote) - Complex dynamics.
- **Military/insurgent activity zones** (MHA advisories | Remote) - AFSPA/disturbed areas.
- **Gender safety index** (NCRB/Women safety | Both) - Differential risk factor.
- **Solo traveler risk modifier** (Computed | Both) - Isolation + Crime combo.
- **Local language barrier** (Profile vs Area | Both) - Communication difficulty.
- **Local community friendliness** (Reviews | Remote) - Welcoming vs hostile.
- **Ongoing festival/event** (Cultural calendar | Both) - Crowds (pickpockets + police).
- **Drug trafficking route proximity** (NCB data | Remote) - Golden Triangle routes.

#### Category 7: Health & Medical (10 factors, Medium Feasibility)
- **Nearest hospital travel time** (Google Distance Matrix | Both)
- **Nearest pharmacy distance** (Google Places | Both)
- **Ambulance response coverage** (108 service | Both) - Remote area delays.
- **Disease outbreak alerts** (IDSP/WHO | Both) - Encephalitis, typhoid.
- **Malaria endemic zone** (NVBDCP | Remote) - Vector-borne risks.
- **Water safety** (PHE dept | Remote) - Hydration risk.
- **Altitude sickness risk** (Computed elevation + ascent | Remote) - AMS probability.
- **Anti-venom availability** (Hospital inventory | Remote) - Snakebite survival.
- **Tourist's personal health conditions** (App profile | Both) - E.g. Asthma + Bad AQI.
- **Vaccination status** (App profile | Remote) - Mismatches with local endemic diseases.

#### Category 8: Time-Based Factors (9 factors, High Feasibility)
- **Time of day** (Device API | Both) - Peak danger often 12AM-5AM.
- **Day of week** (Date calc | Both) - Weekend nights = alcohol risks.
- **Daylight remaining** (Sunset calc | Both) - Dusk in remote areas = panic/danger.
- **Moon phase** (Astronomical calc | Remote) - Natural visibility without lights.
- **Season** (Date calc | Both) - Dictates weather/wildlife/terrain hazards.
- **Duration at location** (App tracking | Both) - Stationary in parks at night = anomaly.
- **Speed of movement** (GPS delta | Both) - Sudden stops = possible accident.
- **Time since last check-in** (App data | Both) - Missingness indicator.
- **Holiday/special date** (Calendar API | Both) - Drunk driving/bandhs.

#### Category 9: Transportation Safety (8 factors, High Feasibility)
- **Road accident hotspots** (NHAI/Police | Both) - NH37 Kaziranga, deadly curves.
- **Traffic density** (Google Traffic | City) - Slows emergency response.
- **Road type currently on** (GPS/OSM | Both) - Highway vs village road.
- **Hairpin turns/mountain danger** (OSM/Elevation | Remote) - Topographical risks.
- **Ferry safety** (IWT records | Remote) - Overloading/weather conditions.
- **Vehicle type available** (Ride-hailing API/Transit | Both) - Cab likelihood.
- **Public transit availability** (Transit schedules | City) - Last bus timing.
- **Parking/stopping safety** (OSM/Rules | Both) - Stopping on NH at night risk.

#### Category 10: Behavioral & Personal (12 factors, High Feasibility)
- **Movement pattern anomaly** (GPS history | Both) - Erratic = chased/lost/drunk.
- **Deviation from planned route** (Itinerary | Both) - Unexpected remote travel.
- **Sudden stop after movement** (GPS velocity | Both) - Fast to zero = crash.
- **App usage pattern change** (App analytics | Both) - Dropped engagement = concern.
- **Phone battery level** (Battery API | Both) - Approaching 0% in remote = critical.
- **Group size** (Profile | Both) - Solo female night vs group of 5.
- **Tourist experience level** (Profile | Both) - First-timer vs veteran.
- **Physical fitness** (Profile/Pace | Remote) - Unfit on difficult treks.
- **Preparation level** (App checklists | Remote) - Has flashlight/water/medkit?
- **Local contact availability** (Profile | Both) - Knowing locals mitigates risk.
- **Document status** (Profile | Both) - Carrying ID/Permits.
- **Cash/payment vulnerability** (Proximity/Reports | Both) - Target for robbery.

#### Category 11: Legal & Regulatory (8 factors, Medium Feasibility)
- **Protected/restricted area status** (MHA advisories | Remote) - ILP/PAP requirements.
- **AFSPA declared area** (MHA notifications | Remote) - Armed Forces Special Powers.
- **Curfew status** (District admin | Both) - Legal restrictions.
- **Photography banned area** (Military maps | Both) - Accidental legal trouble.
- **Foreigner registration requirement** (FRRO | Both) - 24-hour reporting.
- **Local laws/customs** (Legal database | Both) - Dress codes, alcohol bans.
- **National park entry requirements** (Forest dept | Remote) - Mandatory guides/hours.
- **Embassy/consulate proximity** (MFA | Both) - International tourist aid.

#### Category 12: Environmental Quality (6 factors, High Feasibility)
- **Air quality index** (Google Air Quality/CPCB | Both) - Health impacts.
- **Water quality nearby** (Jal Shakti | Remote) - Consumption hazards.
- **Industrial hazard proximity** (Factories Act/Pollution | Both) - Refineries/chemical leaks.
- **Noise level proxy** (Place density + Time | City) - Auditory masking of warnings.
- **Active fire/smoke** (NASA FIRMS/Forest | Remote) - Jhum (slash & burn) fires.
- **Soil stability** (Geological | Remote) - Rain-induced collapse.

#### Category 13: Digital & Cyber Safety (3 factors, Low Feasibility)
- **Public WiFi safety** (Scan analysis | City) - Fake hotspots.
- **SIM scam prevalence** (Police reports | City) - Tourist targeting.
- **Digital payment acceptance rate** (Aggregators | Both) - Forcing cash carrying.

#### Category 14: Tourism Infrastructure (10 factors, Medium Feasibility)
- **Tourism Info Center proximity** (Govt data | Both) - Direct support.
- **Licensed guides available** (Registry | Remote) - Verified escorts.
- **Registered accommodation density** (Hotels API | Both) - Commercial safety standards.
- **Tourist police patrols** (Dispatch data | Both) - Specialized protection.
- **Multi-language signage** (OSM/Audits | Remote) - Wayfinding.
- **Rescue team proximity** (NDRF/SDRF | Remote) - Mountain/wilderness extraction.
- **Safety equipment availability** (Tourism audits | Remote) - Life jackets, first aid.
- **Tourist review sentiment** (Places/TripAdvisor | Both) - "Felt unsafe" text analysis.
- **Visit frequency** (Footfall/Popular times | Both) - Crowds = oversight.
- **Waste/cleanliness index** (Swachh Bharat/Reviews | Both) - Broken windows theory.

#### Category 15: Historical & Predictive (10 factors, High Feasibility)
- **Incident count** (Backend | Both) - 30/90/365 day aggregations.
- **Incident type breakdown** (Backend | Both) - Shapes the precise warning phrasing.
- **Incident trend** (Time-series | Both) - Improving vs deteriorating.
- **Time-of-day distribution** (Cross-tab | Both) - Temporal concentration of risk.
- **Similar location incident rate** (ML clustering | Both) - Extrapolating to unvisited areas.
- **Seasonal incident patterns** (Decomposition | Both) - Holiday peaks.
- **SOS trigger frequency** (Backend | Both) - Real panic indicators.
- **Pre-alert frequency** (Backend | Both) - Uneasiness proxy (2-sec holds).
- **Nearby tourist density** (App tracking | Both) - Herd safety.
- **Predicted score** (Forecasting | Both) - 1/3/6 hours into the future.

#### Category 16: External Intelligence (6 factors, Medium Feasibility)
- **Government travel advisories** (MEA/Foreign Ministries | Both) - Official warnings.
- **NDMA disaster alerts** (API | Both) - Active tectonic/meteorological events.
- **Local news sentiment** (NLP | Both) - Current events processing.
- **Social media risk signals** (Twitter API | Both) - Crowd-sourced spontaneous issues.
- **Community safety reports** (App users | Both) - Waze-style hazard tagging.
- **Similar event global incidents** (Global databases | Both) - Emerging trend correlation.

### 17b. Environment Detection
Factor weights change drastically based on context.
- **Urban**: City density, services, high crime metrics.
- **Suburban**: Moderate density.
- **Rural**: Agriculture, sparse layout.
- **Remote**: Few services, bad connectivity, >5km from settlements.
- **Wilderness**: 0 places, no network, >10km from settlements.

*Weight Distribution changes*:
- **Urban**: Crime + Services + Time dominate (Time: 10%, Police: 12%, Crime: 12%)
- **Wilderness**: Infrastructure + Weather + Survival dominate (Time: 15%, Daylight: 18%, Connect: 18%, Health: 18%)

### 17c. Phase 1 Implementation (Current)
Pure rule-based heuristics utilizing Google Maps APIs, device APIs, and basic backend checks. A weighted score out of 100 determines the theme state (`safe`, `caution`, `danger`).

**15 Active Factors (Phase 1):**
1. **Time of day (10%)**: Device clock. 8am-6pm (95), Late Night 2am-5am (10).
2. **Day of week (3%)**: Weekend night penalty.
3. **Season (5%)**: Monsoon penalty (Assam).
4. **Daylight (5%)**: After sunset drastically lowers score.
5. **Risk Zone (12%)**: Polygon intersections. Score hard-capped based on zone severity.
6. **Police ETA (10%)**: Google Distance Matrix API.
7. **Hospital ETA (8%)**: Google Distance Matrix API.
8. **Area density (8%)**: Google Places nearby search count.
9. **Area place types (7%)**: Safe vs Risky place clustering.
10. **Open businesses (5%)**: `openNow` proxy for crowds.
11. **Active alerts (8%)**: Backend WebSocket alerts count.
12. **Historical incidents (7%)**: Backend past 30 days.
13. **Connectivity (4%)**: `navigator.connection` API.
14. **Weather (5%)**: OpenWeather API.
15. **Air Quality (3%)**: Google Air Quality API.

**Hard Caps**:
- High Risk Zone: `score <= 40`
- Medium Risk Zone: `score <= 65`
- >5 Active Alerts: `score <= 30`
- Zero Network: `score <= 50`

### 17d. Predictive Capabilities (Future)
The ML pipeline will generate forecasts indicating shifting states before they happen.
Outputs include:
- Current Assessment: Score + Primary driving factor.
- Predictions: Forecasted score at `+1h`, `+3h`, `+6h`.
- Reasoning: "Sun will set, temperatures drop, no connectivity".
- Recommendations: Actionable NL prompts comparing alternative actions (Stay vs Leave).

### 17e. Data Source Inventory
- **Free**: OSM, IMD, CWC, NDMA, NCRB, Census, NASA FIRMS, VIIRS, SRTM, GSI, NVBDCP, TRAI, Browser APIs.
- **Paid (Google Maps)**: Places, Directions, Distance Matrix, Geocoding, Air Quality.
- **Internal (Backend)**: Risk Zones, Police DB, Hospital DB, SOS/Pre-Alert Analytics, Incident Hist.
- **Future**: CCTV ML parsing, Ride-hailing APIs, Cell-tower density, Local IoT.

---

## SECTION 18: GOOGLE MAPS API INTEGRATION

### Caching Strategy

| Data Type | Cache Duration | Refresh Trigger |
|-----------|---------------|-----------------|
| Places nearby | 15 minutes | 500m movement |
| Distance Matrix | 5 minutes | 500m movement |
| Reverse Geocode | 1 hour | 500m movement |
| Air Quality | 1 hour | 2km movement |
| Directions | 5 minutes | New destination |
| Place Details | 24 hours | Explicit request |

Cache implementation: In-memory Map with TTL, backed by localStorage for cross-session persistence. Key format includes location hash for distance-based invalidation.

### Area Safety Profiling via Places
Positive signals (increase score): police stations, hospitals, hotels, malls, restaurants, tourist attractions
Negative signals (decrease score): bars at night, very few places (isolation), adult entertainment
Crowd proxy: Count of open businesses, sum of review counts as traffic estimation
Emergency response: Real travel time via Distance Matrix API

### Google API File Structure

```
src/lib/api/google/
├── google-client.ts        ← Base client (API key, rate limiting, error handling)
├── places.ts               ← autocomplete, nearbySearch, placeDetails, placePhotos
├── directions.ts           ← getRoutes, decodePolyline, polyline utilities
├── distance-matrix.ts      ← getDistanceMatrix, batch calculations
├── geocoding.ts            ← reverseGeocode, geocode
├── air-quality.ts          ← getCurrentAQI, getHealthRecommendation
├── cache.ts                ← Generic cache with TTL and distance-based invalidation
└── types.ts                ← All Google API response and request type definitions
```

---

## SECTION 19: BACKEND INFRASTRUCTURE & DATA MODELS

### Architecture Overview
The backend is a Node.js + Express.js REST API using MongoDB as the primary database via Mongoose ORM. It currently lacks advanced security infrastructure like rate-limiting, bcrypt hashing, or containerized DevOps (no Docker/CI). 

### Directory Structure (`backend-node/src/`)
- `config/`: Database connection (`mongoStore.ts`), CORS options, and env parsing.
- `controllers/`: Request handlers mapping to specific domains (e.g., `authController.ts`, `alertController.ts`, `notificationsController.ts`).
- `middleware/`: Custom `requestLogger.ts` and `errorHandler.ts`. Basic `authMiddleware` exists but is inconsistently applied.
- `models/`: Mongoose model initializations (e.g., `Tourist.ts`, `Alert.ts`).
- `routes/`: Express routers aggregating controllers (e.g., `api/auth`, `api/sos`, `api/notifications`).
- `schemas/`: Mongoose schema definitions and TypeScript interfaces.
- `services/`: Business logic and external connections (e.g., `websocketHub.ts`).

### Mongoose Schemas (Data Models)
The system uses standard 2D indexes (`[lat, lng]`) for location queries, not PostGIS.

#### 1. Tourist (`Tourist.schema.ts`)
Core user profile and location tracking entity.
- **Fields**: `_id`, `name`, `email` (unique), `phone`, `passportNumber`, `passwordHash`, `safetyScore` (default 100), `currentLat`, `currentLng`, `lastSeen`.
- **Profile info**: `dateOfBirth`, `address`, `gender`, `nationality`, `emergencyContact` (name + phone), `bloodType`, `allergies[]`, `medicalConditions[]`, `idHash`, `idExpiry`.
- **Auth helpers**: `resetTokenHash`, `resetTokenExpires`, `webauthnCredentials[]` (credentialId, publicKey, counter, transports).
- **Indexes**: Compound index on `{ currentLat: 1, currentLng: 1 }`.

#### 2. RiskZone (`RiskZone.schema.ts`)
Geospatial hazard areas defined by admins.
- **Fields**: `zoneId` (unique), `name`, `description`, `centerLat`, `centerLng`, `radiusMeters`, `riskLevel` (enum: LOW/MEDIUM/HIGH), `active` (boolean).
- **Indexes**: Compound index on `{ centerLat: 1, centerLng: 1 }`, and `{ active: 1 }`.

#### 3. Alert (`Alert.schema.ts`)
SOS triggers, warnings, and system notifications.
- **Fields**: `alertId` (unique), `touristId` (refs Tourist), `alertType`, `priority` (LOW/MEDIUM/HIGH/CRITICAL), `status` (OPEN/ACKNOWLEDGED/RESOLVED/DISMISSED), `latitude`, `longitude`.
- **Indexes**: `{ status: 1 }`, `{ createdAt: -1 }`.

#### 4. Notification (`Notification.schema.ts`)
Tourist notification inbox items.
- **Fields**: `notificationId` (unique), `touristId`, `title`, `message`, `type` (default "system"), `sourceTab` (default "home"), `read` (boolean).
- **Indexes**: `{ touristId: 1, createdAt: -1 }`.

#### 5. PoliceDepartment & Hospital
Static infrastructure entities.
- **Police**: `name`, `departmentCode`, `latitude`, `longitude`, `contactNumber`, `type` (outpost/station/district_hq).
- **Hospital**: `name`, `latitude`, `longitude`, `contactNumber`, `emergency` (boolean), `level` (PHC/CHC/DH/Medical College).

### WebSocket Implementation
- **Hub (`websocketHub.ts`)**: A simple `WebSocketServer` imported from `ws`.
- **Pattern**: Basic broadcast model to `/topic/alerts`. 
- **Limitations**: Currently no advanced room clustering (e.g., grouping users by physical distance to an alert) or namespace management.

---

## SECTION 20: API ENDPOINTS

### Tourist Endpoints

GET /api/tourist/{id}/dashboard
Returns: safetyScore (number), status (safe/caution/danger), openAlerts (number), factors array (id, name, emoji, score, weight, trend), alerts array (id, title, message, severity, timestamp, read), lastUpdated

POST /api/tourist/{id}/location
Body: lat, lng, accuracy (optional), heading (optional), speed (optional)
Returns: acknowledged boolean

GET /api/tourist/{id}/profile
Returns: Full tourist profile (id, name, email, phone, photoUrl, country, touristId, bloodType, allergies array, emergencyContact object, medicalConditions array, validFrom, validUntil, verified)

PUT /api/tourist/{id}/profile
Body: Partial profile fields
Returns: updated boolean, full profile object

### Notification Endpoints

GET /api/tourist/{touristId}/notifications
Auth: Bearer token
Returns: Array of Notification items

POST /api/tourist/{touristId}/notifications/{notificationId}/read
Auth: Bearer token
Returns: updated notification

POST /api/tourist/{touristId}/notifications/read-all
Auth: Bearer token
Returns: success

### SOS Endpoints

POST /api/sos/pre-alert
Body: touristId, lat, lng, timestamp, type "PROLONGED_HOLD", batteryLevel (optional), networkType (optional)
Returns: id, acknowledged boolean

POST /api/sos/trigger
Body: touristId, lat, lng, accuracy (optional), timestamp, type "FULL_SOS", address (optional reverse-geocoded), nearestStation (optional), nearestStationETA (optional)
Returns: id, status "dispatched", respondingStation, estimatedResponse

POST /api/sos/{id}/cancel
Body: reason (optional)
Returns: cancelled boolean

GET /api/sos/{id}/status
Returns: id, status (pre_alert/triggered/dispatched/responding/resolved/cancelled), respondingStation, estimatedArrival, resolvedAt

### Public Endpoints

GET /api/zones/public
Returns: Array of RiskZone (id, name, description, centerLat, centerLng, radiusMeters, riskLevel HIGH/MEDIUM/LOW)

GET /api/police-departments
Returns: Array of station data (id, name, latitude, longitude, contactNumber, isActive, type outpost/station/district_hq)

GET /api/hospitals
Returns: Array of hospital data (id, name, latitude, longitude, contactNumber, type hospital/clinic/pharmacy, emergency boolean, level PHC/CHC/DH/Medical College)

### WebSocket

WS /ws-connect
Authentication: Bearer token in handshake
Server pushes two message types:
- ALERT: id, title, message, severity (high/medium/low), timestamp, location object
- SCORE_UPDATE: score, status, factors array

### Admin Endpoints

POST /api/admin/login
Body: email, password
Returns: success boolean, token, admin object (id, name, email, departmentCode, city, district, state)

GET /api/admin/dashboard/state
Returns: AdminDashboardState (stats, alerts array, tourists array, responseUnits array)

GET /api/admin/alerts/all
Returns: Array of alerts (id, touristId, alertType, status, createdTime, message)

POST /api/admin/alerts/{id}/status
Body: status string
Returns: updated alert

GET /api/admin/tourists
Returns: Array of tourist summaries (id, name, status, safetyScore, lastSeen)

GET /api/admin/risk-zones
Returns: Array of RiskZone

POST /api/admin/risk-zones
Body: name, description, severity, centerLat, centerLng, radiusMeters, riskLevel, active
Returns: created RiskZone

PUT /api/admin/risk-zones/{id}
Body: Partial RiskZone
Returns: updated RiskZone

PATCH /api/admin/risk-zones/{id}/status?active={boolean}
Returns: updated RiskZone

DELETE /api/admin/risk-zones/{id}

POST /api/admin/police
Body: name, email, departmentCode, city, contactNumber, latitude, longitude, passwordHash, district, state
Returns: created PoliceDepartment

PUT /api/admin/police/{id}
Body: Partial PoliceDepartment
Returns: updated PoliceDepartment

DELETE /api/admin/police/{id}

GET /api/admin/id/verify?hash={hash}
Returns: valid boolean, name, passport_partial, id_expiry, blockchain_status

### Auth Endpoints

POST /api/auth/register
Body: TouristRegistrationPayload (name, email, phone, passportNumber, passwordHash, dateOfBirth, address, gender, nationality, emergencyContact, bloodType, allergies, medicalConditions, currentLat, currentLng)
Returns: touristId, token, user (TouristProfile), qr_content

POST /api/auth/login
Body: email, password
Returns: touristId, token, user (TouristProfile), qr_content

POST /api/auth/password-reset/request
Body: email
Returns: success, resetToken (dev only)

POST /api/auth/password-reset/confirm
Body: resetToken, newPassword
Returns: success

POST /api/auth/biometric/register/options
Auth: Bearer token
Returns: WebAuthn registration options

POST /api/auth/biometric/register/verify
Auth: Bearer token
Body: WebAuthn registration response
Returns: success

POST /api/auth/biometric/login/options
Body: email
Returns: WebAuthn authentication options

POST /api/auth/biometric/login/verify
Body: WebAuthn authentication response
Returns: touristId, token, user (TouristProfile), qr_content

GET /api/auth/profile/{touristId}
Returns: TouristProfile

PUT /api/auth/profile/{touristId}
Body: Partial TouristProfile
Returns: updated TouristProfile

### Notification Endpoints

GET /api/tourist/{touristId}/notifications
Auth: Bearer token
Returns: Array of Notification items

POST /api/tourist/{touristId}/notifications/{notificationId}/read
Auth: Bearer token
Returns: updated notification

POST /api/tourist/{touristId}/notifications/read-all
Auth: Bearer token
Returns: success

---

## SECTION 20: COMPLETE FILE STRUCTURE

```
src/
├── App.tsx
├── main.tsx
├── index.css
│
├── layouts/user/
│   ├── UserLayout.tsx
│   ├── components/
│   │   ├── bottom-nav.tsx
│   │   ├── nav-tab.tsx
│   │   └── status-bar.tsx
│   └── types.ts
│
├── pages/user/
│   ├── home/
│   │   ├── Home.tsx
│   │   ├── types.ts
│   │   ├── hooks/
│   │   │   ├── use-dashboard.ts
│   │   │   ├── use-location-share.ts
│   │   │   └── use-notifications.ts
│   │   └── components/
│   │       ├── home-header.tsx
│   │       ├── safety-score-hero.tsx
│   │       ├── safety-factor-pills.tsx
│   │       ├── quick-actions.tsx
│   │       ├── emergency-strip.tsx
│   │       ├── alert-list.tsx
│   │       ├── alert-list-item.tsx
│   │       ├── alert-detail-sheet.tsx
│   │       ├── notification-sheet.tsx
│   │       ├── daily-tip.tsx
│   │       ├── empty-states.tsx
│   │       └── offline-banner.tsx
│   │
│   ├── onboarding/
│   │   ├── Onboarding.tsx
│   │   ├── hooks/
│   │   │   └── use-onboarding.ts
│   │   └── components/
│   │       ├── splash-screen.tsx
│   │       ├── permission-step.tsx
│   │       ├── feature-slides.tsx
│   │       ├── sos-tutorial.tsx
│   │       └── get-started.tsx
│   │
│   ├── auth/
│   │   ├── Auth.tsx
│   │   ├── types.ts
│   │   ├── hooks/
│   │   │   └── use-auth.ts
│   │   └── components/
│   │       ├── auth-header.tsx
│   │       ├── login-form.tsx
│   │       ├── register-form.tsx
│   │       ├── register-step-1.tsx
│   │       ├── register-step-2.tsx
│   │       ├── register-step-3.tsx
│   │       └── auth-success.tsx
│   │
│   ├── map/
│   │   ├── Map.tsx
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── hooks/
│   │   │   ├── use-map-data.ts
│   │   │   ├── use-map-navigation.ts
│   │   │   └── use-navigation.ts
│   │   └── components/
│   │       ├── map-icons.ts
│   │       ├── fly-to-location.tsx
│   │       ├── search-control.tsx
│   │       ├── stats-pill.tsx
│   │       ├── map-controls.tsx
│   │       ├── map-view.tsx
│   │       ├── map-overlays.tsx
│   │       ├── zone-overlay.tsx
│   │       ├── station-markers.tsx
│   │       ├── hospital-markers.tsx
│   │       ├── user-marker.tsx
│   │       ├── destination-marker.tsx
│   │       ├── route-lines.tsx
│   │       ├── route-info-panel.tsx
│   │       ├── navigation-header.tsx
│   │       ├── route-deviation-alert.tsx
│   │       ├── bottom-cards.tsx
│   │       ├── layers-sheet.tsx
│   │       ├── zone-dialog.tsx
│   │       ├── offline-map-banner.tsx
│   │       └── map-loading.tsx
│   │
│   ├── ID/
│   │   ├── Identity.tsx
│   │   ├── types.ts
│   │   ├── hooks/
│   │   │   └── use-identity.ts
│   │   └── components/
│   │       ├── id-card.tsx
│   │       ├── id-card-front.tsx
│   │       ├── id-card-back.tsx
│   │       ├── id-card-flip.tsx
│   │       ├── qr-code-display.tsx
│   │       ├── id-details-sheet.tsx
│   │       ├── id-skeleton.tsx
│   │       └── id-empty-state.tsx
│   │
│   └── settings/
│       ├── Settings.tsx
│       ├── types.ts
│       ├── hooks/
│       │   ├── use-settings.ts
│       │   ├── use-tourist-profile.ts
│       │   ├── use-profile-editor.ts
│       │   └── use-emergency-editor.ts
│       └── components/
│           ├── settings-header.tsx
│           ├── settings-group.tsx
│           ├── settings-item.tsx
│           ├── theme-selector.tsx
│           ├── language-selector.tsx
│           ├── notification-settings.tsx
│           ├── privacy-settings.tsx
│           ├── emergency-profile.tsx
│           ├── logged-in-view.tsx
│           ├── edit-emergency-contact-sheet.tsx
│           ├── edit-blood-type-sheet.tsx
│           ├── edit-allergies-sheet.tsx
│           ├── edit-medical-sheet.tsx
│           ├── message-toast.tsx
│           ├── about-section.tsx
│           ├── danger-zone.tsx
│           └── settings-skeleton.tsx
│
├── components/
│   ├── ui/                          ← All shadcn/ui components plus custom:
│   │   ├── glass-card.tsx           ← Glassmorphism wrapper (level 1/2/3)
│   │   ├── animated-number.tsx      ← rAF-based smooth number morphing
│   │   └── [all standard shadcn components]
│   │
│   ├── sos/
│   │   ├── sos-ball.tsx             ← Floating ball rendering and drag
│   │   ├── sos-gesture-handler.ts   ← Pure gesture detection functions
│   │   ├── sos-confirm-overlay.tsx  ← 3-2-1 countdown full-screen overlay
│   │   ├── sos-success-screen.tsx   ← "Help is on the way" screen
│   │   ├── sos-context.tsx          ← React context definition
│   │   ├── sos-provider.tsx         ← Context provider with state machine
│   │   └── use-sos.ts              ← Hook consuming SOS context
│   │
│   └── shared/
│       ├── pull-to-refresh.tsx      ← Native pull-to-refresh behavior
│       ├── offline-banner.tsx       ← Global offline indicator
│       ├── error-boundary.tsx       ← React error boundary with fallback UI
│       └── page-transition.tsx      ← Tab switch animation wrapper
│
├── lib/
│   ├── api/
│   │   ├── admin.ts                ← Admin API calls
│   │   ├── auth.ts                 ← Auth + password reset + biometrics
│   │   ├── client.ts               ← Base fetch wrapper (auth headers, retry,
│   │   │                               timeout, error handling, toast on failure)
│   │   ├── index.ts                ← API barrel exports
│   │   ├── notifications.ts        ← Notification list + read endpoints
│   │   ├── public.ts               ← Public endpoints (risk zones, stations, hospitals)
│   │   ├── tourist.ts              ← Dashboard + profile calls
│   │   ├── types.ts                ← Shared API response/request types
│   │   └── websocket.ts            ← WebSocket client helpers
│   │
│   ├── session.ts                  ← Session storage and hooks
│   ├── sos.ts                      ← SOS actions and helpers
│   │
│   ├── theme/


*(Continuing from Section 20: Complete File Structure — theme config)*

```
│   │   ├── theme-config.ts         ← Theme state definitions (safe/caution/danger),
│   │   │                              CSS variable value maps, score thresholds,
│   │   │                              oklch to hsl conversion utility
│   │   ├── theme-context.tsx        ← ThemeContext definition with ThemeState type
│   │   ├── theme-provider.tsx       ← Provider that receives score, determines state,
│   │   │                              updates :root CSS variables and shadcn --color-primary,
│   │   │                              manages dark mode auto-switch (6PM/6AM),
│   │   │                              persists preference to localStorage
│   │   ├── use-theme-colors.ts      ← Hook returning current theme colors and state
│   │   └── gradient-mesh.tsx        ← GradientMeshBackground component (pure CSS)
│   │
│   ├── safety/
│   │   ├── score-calculator.ts      ← Main orchestrator: collects factors, runs calculator
│   │   ├── factor-collector.ts      ← Gathers raw factor data from all sources
│   │   ├── phase1-calculator.ts     ← Phase 1 weighted scoring with hard caps
│   │   ├── environment-detector.ts  ← Classifies urban/suburban/rural/remote/wilderness
│   │   └── types.ts                 ← SafetyResult, Factor, FactorCategory,
│   │                                   Environment, Phase1Factors, Recommendation
│   │
│   ├── store/
│   │   ├── app-state.ts            ← Lightweight global state utilities
│   │   └── haptics.ts              ← hapticFeedback("light" | "heavy") wrapper
│   │                                   using navigator.vibrate with fallback
│   │
│   ├── animations/
│   │   ├── variants.ts             ← Reusable animation variant objects
│   │   ├── transitions.ts          ← Transition timing presets
│   │   └── stagger.ts              ← Stagger delay calculator utility
│   │
│   └── utils/
│       ├── cn.ts                   ← clsx + tailwind-merge utility
│       ├── format.ts               ← formatRelativeTime, formatDate, formatPhone
│       ├── geo.ts                  ← haversineDistance, isInsideCircle,
│       │                              degreesToRadians, interpolatePoints
│       ├── storage.ts              ← Typed localStorage wrapper with
│       │                              get/set/remove and JSON parse/stringify
│       └── constants.ts            ← App-wide constants (not page-specific)
│
├── data/
│   ├── assam-restricted-areas.json  ← Fallback risk zone data (used when backend unavailable)
│   └── assam-police-stations.json   ← Fallback police station data
│
├── service-worker/
│   └── sw.ts                        ← Service worker for offline SOS sync,
│                                       push notifications, cache strategies
│
├── layout/admin/
│   └── AdminLayout.tsx              ← Admin top nav, branding, mobile nav,
│                                       user menu dropdown, section routing
│
└── pages/admin/
    ├── index.tsx                     ← AdminPanel composition root (auth + sections + dialogs)
    ├── types.ts                      ← Admin types (Tourist, RiskZone, Alert, PoliceDepartment,
    │                                    DashboardStats, AdminData, form data, filters)
    ├── hooks/
    │   ├── index.ts
    │   └── useAdminData.ts           ← Data fetching, normalization, filtering,
    │                                    CRUD action hooks (alerts, zones, police)
    ├── sections/
    │   ├── index.ts
    │   ├── DashboardSection.tsx      ← Overview stats, recent alerts, activity feed
    │   ├── AlertsSection.tsx         ← Alert table with filters, bulk resolve
    │   ├── TouristsSection.tsx       ← Tourist list with risk indicators
    │   ├── ZonesSection.tsx          ← Risk zone map + list with CRUD
    │   └── PoliceSection.tsx         ← Police unit management
    ├── components/
    │   ├── index.ts
    │   ├── LoginScreen.tsx           ← Admin login form
    │   ├── StatCard.tsx              ← Dashboard summary cards
    │   ├── ActionBar.tsx             ← Section-level action toolbar
    │   ├── ActivityItem.tsx          ← Dashboard activity feed item
    │   ├── AlertTableRow.tsx         ← Alert table row component
    │   ├── TouristTableRow.tsx       ← Tourist table row with risk badge
    │   ├── ZoneCard.tsx              ← Risk zone display card
    │   ├── PoliceCard.tsx            ← Police unit display card
    │   └── InteractiveMap.tsx        ← Leaflet map for zone management
    └── dialogs/
        ├── index.ts
        ├── AlertDetailDialog.tsx     ← Detailed alert view + resolve action
        ├── TouristDetailDialog.tsx   ← Tourist profile + tracking + contact
        ├── ZoneDialog.tsx            ← Create/edit risk zone form
        ├── PoliceDialog.tsx          ← Create/edit police unit form
        ├── BroadcastDialog.tsx       ← Send broadcast to tourists
        ├── SettingsDialog.tsx        ← Admin settings (placeholder)
        ├── ReportsDialog.tsx         ← Generate reports (placeholder)
        └── ConfirmDeleteDialog.tsx   ← Delete confirmation modal
```

Total files: approximately 125+

---

## SECTION 21: CSS ARCHITECTURE (index.css — Complete Specification)

The index.css file is the foundation of the entire visual system. It must contain all of the following sections in order.

### Section 1: Tailwind Import
```css
@import "tailwindcss";
```

### Section 2: @theme Block (Tailwind v4 Format)
Contains all shadcn color tokens, custom animation definitions, and radius values.

Color tokens include: background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, destructive-foreground, border, input, ring.

Animation definitions in @theme block:
- --animate-mesh-drift-1: mesh-drift-1 60s ease-in-out infinite
- --animate-mesh-drift-2: mesh-drift-2 55s ease-in-out infinite
- --animate-mesh-drift-3: mesh-drift-3 65s ease-in-out infinite
- --animate-mesh-drift-4: mesh-drift-4 50s ease-in-out infinite
- --animate-sos-pulse: sos-pulse var(--sos-pulse-speed, 3s) ease-in-out infinite
- --animate-countdown-pop: countdown-pop 0.4s ease-out
- --animate-scale-in: scale-in 0.3s ease-out
- --animate-bounce-left: bounce-left 1s ease-in-out infinite
- --animate-bounce-right: bounce-right 1s ease-in-out infinite
- --animate-bounce-up: bounce-up 1s ease-in-out infinite
- --animate-bounce-down: bounce-down 1s ease-in-out infinite
- --animate-holo-shift: holo-shift 6s ease-in-out infinite
- --animate-draw-ring: draw-ring 1s ease-out forwards

Radius: --radius: 1rem

### Section 3: @property Declarations
Every animatable CSS custom property must have an @property declaration for smooth browser interpolation:

```css
@property --theme-bg-from { syntax: '<color>'; initial-value: oklch(0.97 0.03 160); inherits: true; }
@property --theme-bg-to { syntax: '<color>'; initial-value: oklch(0.97 0.02 180); inherits: true; }
@property --theme-primary { syntax: '<color>'; initial-value: oklch(0.65 0.17 160); inherits: true; }
@property --theme-primary-foreground { syntax: '<color>'; initial-value: oklch(0.99 0 0); inherits: true; }
@property --theme-glow { syntax: '<color>'; initial-value: oklch(0.65 0.17 160 / 0.15); inherits: true; }
@property --theme-card-bg { syntax: '<color>'; initial-value: rgba(255, 255, 255, 0.70); inherits: true; }
@property --theme-card-border { syntax: '<color>'; initial-value: rgba(16, 185, 129, 0.15); inherits: true; }
@property --sos-scale { syntax: '<number>'; initial-value: 1; inherits: true; }
@property --sos-pulse-speed { syntax: '<time>'; initial-value: 3s; inherits: true; }
```

### Section 4: :root Variables
All CSS custom properties with default values (safe theme). Includes theme variables, zone colors, route colors, SOS variables, holographic variables.

CRITICAL: The transition declaration on :root uses SPECIFIC property names, NOT "transition: all 2s":
```css
:root {
  --theme-bg-from: oklch(0.97 0.03 160);
  --theme-bg-to: oklch(0.97 0.02 180);
  --theme-primary: oklch(0.65 0.17 160);
  --theme-primary-foreground: oklch(0.99 0 0);
  --theme-glow: oklch(0.65 0.17 160 / 0.15);
  --theme-card-bg: rgba(255, 255, 255, 0.70);
  --theme-card-border: rgba(16, 185, 129, 0.15);
  --sos-scale: 1;
  --sos-pulse-speed: 3s;
  
  --zone-high: #dc2626;
  --zone-medium: #ea580c;
  --zone-low: #ca8a04;
  
  --route-safest: #10b981;
  --route-fastest: #3b82f6;
  --route-alt: #94a3b8;

  transition-property: --theme-bg-from, --theme-bg-to, --theme-primary,
                       --theme-primary-foreground, --theme-glow,
                       --theme-card-bg, --theme-card-border,
                       --sos-scale, --sos-pulse-speed;
  transition-duration: 2s;
  transition-timing-function: ease-in-out;
}
```

### Section 5: .dark Overrides
All dark mode color overrides for both shadcn tokens and custom theme variables. Safety theme glows increase from 15% to 25% opacity in dark mode.

### Section 6: Glass Component
Use the `<GlassCard>` React component (from `@/components/ui/glass-card`) with `level={1|2|3}` instead of standalone CSS classes.

### Section 7: Gradient Mesh Background
.gradient-mesh class with radial gradients, animation, opacity for light/dark.

### Section 8: Keyframe Animations
All @keyframes declarations:

mesh-drift-1 through mesh-drift-4 (60s/55s/65s/50s loops, translate + scale variations)
sos-pulse (box-shadow expansion and fade)
countdown-pop (scale 0.3 to 1.15 overshoot to 1.0)
scale-in (scale 0.5 to 1.0 with opacity)
bounce-left, bounce-right, bounce-up, bounce-down (8px directional bounce)
holo-shift (background-position shift for holographic shimmer)
draw-ring (stroke-dashoffset animation for SVG ring progress)
slide-in-from-top, slide-in-from-bottom (100% translate to 0)
slide-in-up (12px translateY to 0 with opacity, used for stagger)
fade-in (opacity 0 to 1)
glow-pulse (box-shadow intensity oscillation)
float (translateY up and down 6px, 3s loop)
confirm-zone-expand (scale + opacity for SOS confirm zone)
ripple (scale + opacity for tap feedback)
skeleton-shimmer (background-position shift for loading skeletons)
marker-ping (scale 1 to 2.5 with opacity fade for user marker)

### Section 9: Utility Classes

no-scrollbar: hides webkit scrollbar and sets ms-overflow-style/scrollbar-width
safe-area-top / safe-area-bottom: env() padding
touch-action: scale + opacity active state, webkit tap highlight transparent
scroll-fade-x: CSS mask-image with left/right gradient fades
holo-overlay: holographic shimmer absolute overlay
skeleton-shimmer: gradient background animated shimmer
duration-2000: transition-duration 2000ms

### Section 10: Stagger Animation
.stagger-children > * with nth-child delays from 0ms to 420ms (60ms increments, 8 children max)
Uses slide-in-up keyframe

### Section 11: Card Effects
.card-hover: transform translateY(-2px) + shadow on hover
Button gradient classes: .btn-gradient-primary, .btn-gradient-danger, .btn-gradient-success

### Section 12: Input Focus
input:focus and textarea:focus: outline none, 3px ring shadow in primary/20

### Section 13: Interactive Element Rules
button, a, .touch-action: user-select none
html: scroll-behavior smooth
body: webkit-font-smoothing antialiased, moz-osx-font-smoothing grayscale

### Section 14: Leaflet Overrides
.leaflet-popup-content-wrapper: glassmorphism (bg white/92, backdrop-blur 16px, rounded 1rem, shadow, border)
.dark .leaflet-popup-content-wrapper: dark glassmorphism
.leaflet-popup-tip: matching background
.leaflet-popup-close-button: styled for both modes
.leaflet-tooltip: glassmorphism
.dark .leaflet-tooltip: dark variant
.leaflet-tooltip-top::before: matching border colors
.leaflet-control-attribution: minimal styling (9px, bg white/70, rounded)
.dark .leaflet-control-attribution: dark variant
.dark .leaflet-tile-pane: filter brightness(0.95) contrast(1.05)

### Section 15: Print Styles
@media print: Hide SOS ball, bottom nav, leaflet controls, popup pane. Force white background.

### Section 16: Reduced Motion
@media (prefers-reduced-motion: reduce):
All animations: duration 0.01ms, iteration-count 1
All transitions: duration 0.01ms
.gradient-mesh: animation none, static opacity 0.2
.stagger-children > *: opacity 1, animation none
.sos-ball: animation none (use static glow shadow instead)

---

## SECTION 22: OFFLINE STRATEGY

### Must Work Offline (Critical Features)
- SOS trigger: Queued to localStorage, service worker background sync sends when restored
- Emergency tel: links: Always functional (native phone capability)
- Digital ID: Cached in localStorage, viewable without network
- Last safety score: Cached, displayed with "Last updated {time}" notice
- Emergency contacts strip: Static data, always rendered

### Can Degrade Gracefully
- Map: Cached tiles show, new tiles show gray. "Offline" banner shown.
- Search: Shows "Search unavailable offline" message
- Alerts: Show cached alerts with notice "May not be current"
- Location sharing: Queue location updates, sync when restored
- Settings: Changes saved locally, synced to backend when restored
- Safety score: Show last cached score with stale indicator

### Offline SOS Queue
```typescript
interface OfflineSOS {
  id: string;
  touristId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  status: 'queued' | 'sending' | 'sent' | 'failed';
}
```

Stored in localStorage under key "sos-offline-queue" as JSON array.
Service worker registers sync event tag "sync-sos".
On sync event: reads queue, attempts to POST each, removes successful entries, retries failed on next sync.

Offline SOS success screen shows modified message:
- "SOS Saved" instead of "SOS Sent"
- "Will send when connection restored" subtitle
- Emergency call button still available (tel: works offline)
- "I'm Safe" dismiss still works (clears from queue)

### Network Detection
```typescript
// In hooks and providers
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => { setIsOnline(true); toast.success("Back online"); };
  const handleOffline = () => { setIsOnline(false); toast.warning("You're offline"); };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

---

## SECTION 23: CODING RULES (ENFORCED — NO EXCEPTIONS)

1. MODULARITY: Every component in its own file. No file exceeds 150 lines. If it does, extract sub-components.

2. HOOKS FOR LOGIC: All data fetching, state management, effects, and business logic live in custom hooks. Components only render JSX.

3. PURE FUNCTIONS: Gesture calculations, theme computation, formatting, scoring — all pure functions with no side effects, easily testable.

4. TYPE SAFETY: Every prop, state variable, function parameter, and return value is explicitly typed. No 'any' type anywhere.

5. SHADCN FIRST: Use shadcn/ui components as base for all UI elements. Do not build buttons, inputs, dialogs, sheets, badges, cards, or other standard components from scratch.

6. CSS VARIABLES: Never hardcode colors for theme-dependent elements. Always reference CSS custom properties (--theme-*, --color-*) so the dynamic theme system works.

7. PERFORMANCE: React.memo for list items and repeated components. useCallback for functions passed as props. useMemo for expensive computed values. CSS animations over JS animations. Avoid unnecessary re-renders.

8. ACCESSIBILITY: aria-labels on all interactive elements (buttons, links, inputs). Color is never the ONLY indicator of state (always paired with text/icon). 44px minimum touch targets everywhere. Focus management in modals and sheets.

9. MOBILE-FIRST: active: states over hover: states (hover doesn't exist on mobile). Safe area support. Touch-optimized interactions. No reliance on right-click or hover tooltips for critical functionality.

10. NO DEAD CODE: No commented-out blocks. No unused imports. No TODO comments. No placeholder functions that do nothing. Every line serves a purpose.

11. COMPOSITION ROOTS: Page files (Home.tsx, Map.tsx, Identity.tsx, Settings.tsx) are SHORT composition-only files. Maximum 40-60 lines. They import sub-components and hooks, compose them, and return JSX. Zero business logic.

12. ERROR HANDLING: No silent catch{} blocks. Every error is either shown to the user via toast notification, logged for debugging, or handled with a fallback state. API calls have retry logic, timeout handling, and user-visible error messages.

---

## SECTION 24: KEY DESIGN DECISIONS ALREADY MADE

These decisions are FINAL and should not be revisited:

1. SOS is a GLOBAL floating ball, not a page-specific button. There is NO SOS button on the map page or any other page.
2. Safety score is the HERO element of the home page — largest visual, top of content.
3. Emergency contacts are ALWAYS visible as a horizontal strip, never collapsible or hidden.
4. Alerts are compact LIST ROWS with colored dots, not full-width cards.
5. Daily tip is STATIC (random on mount per day), not rotating or auto-advancing.
6. Map uses Leaflet for rendering, Google for data (hybrid approach).
7. Safe route scoring uses zone intersection analysis with weighted penalties and police bonuses.
8. Theme transitions are exactly 2 seconds with smooth oklch color interpolation.
9. Dark mode auto-switches at 6 PM (dark) and 6 AM (light) in auto mode.
10. Nearest station/hospital shows real calculated travel TIME and distance, not straight-line approximation.
11. No weather widget on home page — weather data feeds into the safety score silently.
12. Score factors are shown as horizontal scrollable pills with trend arrows.
13. Pages are composition roots: maximum 40-60 lines, zero logic.
14. All previously commented-out code has been removed.
15. All hardcoded user data has been replaced with session data from context.
16. Glass card hierarchy is enforced (Level 1 for heroes, Level 2 for actions, Level 3 for info).
17. Map has no local SOS button — the global floating SOS ball is always accessible.
18. Map controls are merged into a single right-side column (compass, zoom in, zoom out, locate).
19. Factor pills use trend icons (arrows up/down/right) not color alone.
20. The gradient mesh background is pure CSS (no JavaScript animation frames).

---

## SECTION 25: DATA SOURCES

### Free Data Sources
- OpenStreetMap: Base map tiles, place data via Nominatim
- India Meteorological Department: Weather data
- Central Water Commission: Flood data
- National Disaster Management Authority (NDMA): Disaster alerts
- National Crime Records Bureau (NCRB): Crime statistics
- Census of India: Population data, demographic information
- NASA FIRMS: Active fire detection via satellite
- VIIRS: Night lights data (proxy for development level)
- SRTM: Elevation data (30m resolution)
- Geological Survey of India: Earthquake and landslide data
- NVBDCP: Malaria and vector-borne disease data
- TRAI: Telecom coverage data
- Browser APIs: Geolocation, battery, network information, device orientation

### Paid Data Sources (Google Maps Platform)
- Places API: Search, details, nearby, photos
- Directions API: Route calculation with alternatives
- Distance Matrix API: Travel time calculations
- Geocoding API: Address lookup and reverse geocode
- Air Quality API: AQI data
- Geolocation API: WiFi-based positioning fallback

### Internal Data Sources
- Risk zones database (backend PostgreSQL + PostGIS)
- Police stations database
- Hospital database
- Incident reports (historical)
- SOS history
- Pre-alert history
- Tourist location tracking
- Community safety reports
- Admin-published alerts

### Local Dataset Files (in src/data/)
- assam-restricted-areas.json: Fallback risk zone definitions with positions, radii, risk levels
- assam-police-stations.json: Fallback police station list organized by district with positions, contacts, availability

---

## SECTION 26: CURRENT PROJECT STATE

### What Exists (Production-Quality)
- UserLayout with tab navigation, SOS ball integration, and ThemeProvider
- Home page (composition root, 45 lines, all sub-components, pull-to-refresh, WebSocket real-time alerts)
- Onboarding flow (splash, permissions, feature slides, SOS tutorial)
- Notification center sheet with mark-all-read and read tracking
- Alert detail sheet with map focus action
- Map page (composition root, ~70 lines, all 20 features, MapView + MapOverlays extracted)
- Active navigation header with arrival + deviation detection
- Identity page (card flip animation, QR code, holographic shimmer, extracted skeleton)
- Settings page (auth gate, emergency profile edit sheets, settings groups)
- SOS floating ball system (6 states, gesture handler, confirm overlay, success screen)
- Dynamic theme engine (score-driven oklch transitions, auto dark mode at 6PM/6AM)
- Glassmorphism card system (glass-1, glass-2, glass-3 via GlassCard component)
- Modular API layer (lib/api/ with client, types, tourist, public, admin, websocket modules)
- Modular store (lib/store/ with app-state, haptics, backward-compat barrel)
- Utility libraries (lib/utils/ with format, geo, storage)
- Gradient mesh background component
- Animated number component
- Error boundary with retry fallback UI
- Global offline banner component
- Admin console (29 files: dashboard, alerts, tourists, risk zones, police management)
- Dual auth system (tourist login/register + admin login with JWT tokens)
- Password reset endpoints + WebAuthn biometric auth
- Pull-to-refresh component

### What Needs Building
- Google Maps API integration (lib/api/google/ — places, directions, distance-matrix, geocoding, air-quality, caching)
- Phase 1 safety score calculator (lib/safety/ — client-side rule-based with 15 factors)
- Service worker for offline capabilities (SOS queue, push notifications, cache strategies)
- Fallback data files (data/assam-restricted-areas.json, data/assam-police-stations.json)
- Animation system utilities (lib/animations/ — variants, transitions, stagger helpers)
- Page transition wrapper (components/shared/page-transition.tsx)
- Session refactor to React Context pattern (currently useSyncExternalStore)
- Admin panel architecture refactor (index.tsx at 413 lines, needs composition root pattern)
- Route guards / middleware for admin auth (currently inline in AdminPanel)

---

## SECTION 27: AUTHENTICATION & SESSION MANAGEMENT

### Tourist Auth Flow
1. User opens Settings tab → sees Auth screen (login/register)
2. Registration: POST /api/auth/register → receives { touristId, token, user, qr_content }
3. Login: POST /api/auth/login → receives { touristId, token, user, qr_content }
4. Remember-me enabled → session stored in localStorage, otherwise in sessionStorage
5. Optional biometrics: WebAuthn register + login via `/api/auth/biometric/*`
6. Password reset: request token then confirm with new password
7. Session accessed app-wide via `useSession()` hook (useSyncExternalStore pattern)
8. Logout: `clearSession()` removes localStorage/sessionStorage keys

### Admin Auth Flow
1. Admin navigates to /admin → App.tsx renders AdminLayout
2. AdminLayout uses `useAdminSession()` for header/nav state
3. AdminPanel checks `localStorage.getItem("adminToken")` for auth state
4. If not authenticated → renders LoginScreen component
5. Login: POST /api/admin/login → stores token in localStorage, sets admin session
6. Logout: `clearAdminSession()` removes localStorage keys

### Session Types

**Tourist Session** (lib/session.ts):
- touristId, name, email, token
- Stored as `safarSathiSession` in localStorage or `safarSathiSession:temp` in sessionStorage
- Reactive via useSyncExternalStore with listeners

**Admin Session** (lib/session.ts):
- adminId, name, email, departmentCode, city, district, state
- Stored as `safarSathiAdminSession` in localStorage
- Reactive via useSyncExternalStore with listeners

### Known Issues
- No JWT refresh mechanism — tokens persist until manual logout
- No token expiry validation on client side
- Admin auth is duplicated: AdminPanel checks localStorage directly AND uses useAdminSession()
- No route-level auth guards — auth is checked inline in components

---

## SECTION 28: ADMIN CONSOLE ARCHITECTURE

### Layout
AdminLayout.tsx renders:
- Top header bar with SafarSathi branding, nav tabs, search, live status indicator, user dropdown
- Mobile-responsive: horizontal scrolling nav on small screens
- Renders AdminPanel as main content area

### Admin Sections (5 tabs)

| Tab | Component | Features |
|-----|-----------|----------|
| Dashboard | DashboardSection | Stats overview, recent alerts, activity feed, quick actions |
| Alerts | AlertsSection | Filterable alert table, bulk resolve, individual resolve |
| Tourists | TouristsSection | Tourist list with risk levels, contact, track on map |
| Risk Zones | ZonesSection | Interactive map for zone CRUD, click-to-place zones |
| Police Units | PoliceSection | Police department management with CRUD |

### Data Flow
```
useAdminData(isAuthenticated)
  → fetches: dashboard, alerts, tourists, risk zones, police
  → normalizes: API responses → typed AdminData
  → returns: { data, refreshing, refetch }

useAlertActions(refetch): resolve, bulkResolve
useZoneActions(refetch): save, delete
usePoliceActions(refetch): save, delete
useFilteredData(data, ...filters): computed filtered views
useQuickStats(data): derived statistics
```

### Known Issues
- AdminPanel index.tsx is 413 lines — should be a composition root ≤60 lines
- Hardcoded API_BASE in index.tsx (`http://localhost:8081/api`) duplicates lib/api/client.ts
- Login uses raw fetch instead of lib/api/admin.ts `adminLogin()` function
- 15+ useState calls in AdminPanel — should be extracted to a dedicated hook
- Dialog state management is verbose — consider a reducer or dialog manager

---

## SECTION 29: ROUTING & ROLE-BASED ACCESS

### Current Routing (App.tsx)
Manual pathname-based routing using `window.location.pathname`:
```
/ → UserLayout (contains Home, Map, ID, Settings tabs)
/admin → AdminLayout → AdminPanel
```

No React Router — uses `popstate` event listener and conditional rendering.

### Role Detection
- Tourist: Any user on `/` path. Auth is optional (unauthenticated users see limited UI).
- Admin: Any user on `/admin` path. Auth required — LoginScreen shown if no token.
- No explicit role field — admin vs tourist determined purely by navigation path.

### Known Issues
- No client-side route protection — admin page is accessible to anyone who navigates to /admin
- No 404 handling — unknown paths render nothing
- No deep linking support within tabs
- Switching between /admin and / requires full page reload

---
