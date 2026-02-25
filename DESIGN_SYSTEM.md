# Open Raccoon Design System Specification

**Version:** 1.0.0
**Date:** February 2026
**Philosophy:** Minimalistic, calm, focused. White-mode default, typography-driven, generous whitespace, muted colors. Telegram-speed simplicity meets Linear/Notion aesthetics.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography System](#3-typography-system)
4. [Spacing and Layout](#4-spacing-and-layout)
5. [Component Patterns](#5-component-patterns)
6. [Agent Status Messages](#6-agent-status-messages)
7. [Animation and Motion](#7-animation-and-motion)
8. [Branding](#8-branding)
9. [AI Loading and Thinking States](#9-ai-loading-and-thinking-states)

---

## 1. Design Principles

### Core Tenets

1. **Restraint over decoration.** Nothing is added unless it earns its place. Whitespace is not waste — it is breathing room that makes what remains feel intentional.
2. **Typography as structure.** Type carries the hierarchy, not color or ornamentation. The interface reads like a well-set page.
3. **Calm over stimulation.** Muted, desaturated tones. No bright gradients, no visual noise. The user's content is the loudest thing on screen.
4. **Speed as a feature.** Every interaction feels instant. Animations exist to orient, not to entertain. If something can be shown without a transition, show it.
5. **Density with clarity.** Show enough information to be useful without creating clutter. Inspired by Linear's approach to information density.

---

## 2. Color System

### 2.1 Light Mode (Primary)

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#FFFFFF` | Main app background |
| `bg-secondary` | `#FAFAFA` | Sidebar, panels, secondary surfaces |
| `bg-tertiary` | `#F5F5F5` | Conversation list hover, subtle cards |
| `bg-elevated` | `#FFFFFF` | Modals, popovers (with shadow) |
| `bg-input` | `#F5F5F5` | Input fields, search bars |
| `bg-message-sent` | `#F0F0F0` | Sent message bubbles |
| `bg-message-received` | `#FFFFFF` | Received message bubbles (with border) |
| `border-primary` | `#E5E5E5` | Primary borders, dividers |
| `border-secondary` | `#EBEBEB` | Subtle borders, input borders |
| `border-focus` | `#171717` | Focused input borders |
| `text-primary` | `#171717` | Headings, primary body text |
| `text-secondary` | `#737373` | Timestamps, captions, secondary labels |
| `text-tertiary` | `#A3A3A3` | Placeholder text, disabled labels |
| `text-inverse` | `#FFFFFF` | Text on accent backgrounds |

### 2.2 Dark Mode (Secondary)

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#161616` | Main app background |
| `bg-secondary` | `#1C1C1C` | Sidebar, panels |
| `bg-tertiary` | `#232323` | Hover states, subtle cards |
| `bg-elevated` | `#1C1C1C` | Modals, popovers (with shadow) |
| `bg-input` | `#232323` | Input fields |
| `bg-message-sent` | `#2A2A2A` | Sent message bubbles |
| `bg-message-received` | `#1C1C1C` | Received message bubbles (with border) |
| `border-primary` | `#2A2A2A` | Primary borders, dividers |
| `border-secondary` | `#333333` | Subtle borders |
| `border-focus` | `#E5E5E5` | Focused input borders |
| `text-primary` | `#EDEDED` | Headings, primary body text |
| `text-secondary` | `#8C8C8C` | Timestamps, captions |
| `text-tertiary` | `#5C5C5C` | Placeholder text, disabled |
| `text-inverse` | `#171717` | Text on light accent backgrounds |

**Dark mode rationale:** Deep grays (`#161616`) instead of pure black (`#000000`). Pure black creates excessive contrast on OLED screens and feels harsh. Deep gray maintains depth while feeling softer. This follows Linear's approach.

### 2.3 Accent Color

| Token | Hex | Usage |
|---|---|---|
| `accent-primary` | `#6E56CF` | Primary action buttons, links, active states |
| `accent-primary-hover` | `#5B44B2` | Hover state for accent |
| `accent-primary-subtle` | `#F3F0FF` | Light mode accent background tint |
| `accent-primary-subtle-dark` | `#251F3A` | Dark mode accent background tint |

**Rationale:** Muted violet. Not the electric purple of Discord or Twitch. A desaturated, sophisticated violet that feels calm and professional. Stands out without screaming. Works well against both white and dark gray backgrounds. Avoids the overused blue (Telegram, Facebook) and green (WhatsApp, Signal) spaces.

### 2.4 Semantic Colors

| Token | Light Hex | Dark Hex | Usage |
|---|---|---|---|
| `semantic-success` | `#2D7D46` | `#3DB95E` | Delivered, connected, online |
| `semantic-success-bg` | `#EDFBF0` | `#1A2E1F` | Success background tint |
| `semantic-warning` | `#C17A1A` | `#E5A236` | Slow connection, rate limit |
| `semantic-warning-bg` | `#FFF8EB` | `#2E2515` | Warning background tint |
| `semantic-error` | `#CD3131` | `#F14C4C` | Failed send, disconnected |
| `semantic-error-bg` | `#FDECEC` | `#2E1717` | Error background tint |
| `semantic-info` | `#3B82F6` | `#60A5FA` | Informational, tips |
| `semantic-info-bg` | `#EFF6FF` | `#172035` | Info background tint |

**Note:** Semantic colors are deliberately muted in light mode (dark tones, not saturated) and slightly brighter in dark mode for legibility. They should never feel alarming in non-critical contexts.

### 2.5 Agent-Specific Accent Colors

Each AI agent gets a unique, muted accent for avatar rings, status indicators, and inline labels.

| Agent | Hex | Description |
|---|---|---|
| Default / Raccoon | `#6E56CF` | Muted violet (primary brand accent) |
| Code Agent | `#3B82F6` | Muted blue |
| Research Agent | `#0EA5E9` | Muted cyan |
| Creative Agent | `#D946EF` | Muted fuchsia |
| Deploy Agent | `#22C55E` | Muted green |
| Custom Agent 1 | `#F59E0B` | Muted amber |
| Custom Agent 2 | `#EC4899` | Muted pink |
| Custom Agent 3 | `#14B8A6` | Muted teal |

**Usage rules:**
- Agent accent appears as a 2px ring around the agent avatar
- Agent accent is used in the status indicator dot
- Agent accent tints the "thinking" shimmer animation
- Agent accent never replaces the primary UI accent for buttons or links

### 2.6 Platform Badge Colors

For multi-platform message routing indicators (small 12px pills or dots).

| Platform | Hex | Description |
|---|---|---|
| Telegram | `#2AABEE` | Official Telegram blue |
| WhatsApp | `#25D366` | Official WhatsApp green |
| Signal | `#3A76F0` | Official Signal blue |
| Discord | `#5865F2` | Official Discord blurple |
| Slack | `#4A154B` | Official Slack aubergine |
| Email | `#737373` | Neutral gray (generic) |
| SMS | `#8C8C8C` | Light gray (generic) |
| iMessage | `#34C759` | Apple iMessage green |
| Matrix | `#0DBD8B` | Matrix protocol green |

**Usage rules:**
- Platform colors appear ONLY on small indicator badges (12-16px pills)
- They are never used for backgrounds, borders, or large UI elements
- In dark mode, these colors maintain the same hex values but may receive a subtle opacity reduction to `90%` to avoid feeling too bright

---

## 3. Typography System

### 3.1 Font Stack

| Platform | Primary | Fallback |
|---|---|---|
| macOS | SF Pro Display / SF Pro Text | -apple-system, system-ui, sans-serif |
| iOS | SF Pro Display / SF Pro Text | -apple-system, system-ui, sans-serif |
| Web | Inter | system-ui, -apple-system, sans-serif |
| Code | SF Mono | JetBrains Mono, Menlo, Consolas, monospace |

**CSS font-family declarations:**

```css
/* Primary text */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display',
  system-ui, 'Segoe UI', Roboto, sans-serif;

/* Code and monospace */
--font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Monaco,
  Consolas, 'Liberation Mono', monospace;
```

**SF Pro switching rule:** Use SF Pro Display for sizes >= 20px. Use SF Pro Text for sizes < 20px. On Apple platforms, the system handles this automatically via the system font API. On web, Inter handles all sizes.

### 3.2 Type Scale

Base size: 14px (app UI context, not editorial). Scale ratio: roughly 1.25 (Major Third), adjusted for practical use.

| Token | Size (px) | Size (rem) | Line Height | Weight | Usage |
|---|---|---|---|---|---|
| `text-2xs` | 10 | 0.625 | 14px (1.4) | 400 | Platform badge labels, micro-timestamps |
| `text-xs` | 11 | 0.6875 | 16px (1.45) | 400 | Timestamps, badges, counters |
| `text-sm` | 12 | 0.75 | 18px (1.5) | 400 | Captions, helper text, metadata |
| `text-base` | 14 | 0.875 | 22px (1.57) | 400 | Body text, messages, list items |
| `text-md` | 15 | 0.9375 | 24px (1.6) | 400 | Message body (slightly larger for readability) |
| `text-lg` | 16 | 1.0 | 24px (1.5) | 500 | Section headers, nav items |
| `text-xl` | 18 | 1.125 | 26px (1.44) | 600 | Panel titles, dialog headers |
| `text-2xl` | 20 | 1.25 | 28px (1.4) | 600 | Page titles |
| `text-3xl` | 24 | 1.5 | 32px (1.33) | 600 | Hero headings (rare in app context) |
| `text-4xl` | 30 | 1.875 | 38px (1.27) | 700 | Marketing / onboarding only |

### 3.3 Font Weights

| Weight | Value | Usage |
|---|---|---|
| Regular | 400 | Body text, messages, descriptions, placeholders |
| Medium | 500 | Navigation labels, conversation names, section headers, emphasis |
| Semibold | 600 | Titles, headings, active states, badges, buttons |
| Bold | 700 | Sparingly. Onboarding headlines, marketing text only |

**Rule of thumb:** The app UI should never feel "heavy." Semibold is the maximum weight used in standard app chrome. Bold is reserved for rare display text.

### 3.4 Letter Spacing

| Size Range | Letter Spacing |
|---|---|
| 10-12px | +0.02em (slightly open for legibility at small sizes) |
| 14-16px | 0em (default tracking) |
| 18-24px | -0.01em (slightly tight for headings) |
| 24px+ | -0.02em (tighter for display sizes) |

### 3.5 Monospace / Code Typography

| Token | Size (px) | Line Height | Weight | Usage |
|---|---|---|---|---|
| `code-inline` | 13 | 20px | 400 | Inline code in messages |
| `code-block` | 13 | 22px (1.69) | 400 | Code blocks, terminal output |
| `code-block-lg` | 14 | 24px (1.71) | 400 | Workspace code editor |

**Code styling:**
- Inline code: `bg-tertiary` background, 2px horizontal padding, 2px border-radius
- Code blocks: `bg-secondary` background, 12px padding, 8px border-radius, left border 2px `accent-primary` or `border-primary`
- Line numbers: `text-tertiary`, right-aligned, 48px gutter width
- Syntax highlighting: Use a muted theme. Avoid saturated rainbow syntax colors. Suggested palette below.

**Syntax highlighting tokens (light mode):**

| Token | Hex | Usage |
|---|---|---|
| `syntax-keyword` | `#6E56CF` | Keywords, storage types |
| `syntax-string` | `#2D7D46` | Strings, template literals |
| `syntax-number` | `#C17A1A` | Numbers, constants |
| `syntax-function` | `#3B82F6` | Function names, method calls |
| `syntax-comment` | `#A3A3A3` | Comments |
| `syntax-variable` | `#171717` | Variables, parameters |
| `syntax-type` | `#0EA5E9` | Type annotations, interfaces |
| `syntax-operator` | `#737373` | Operators, punctuation |

**Syntax highlighting tokens (dark mode):**

| Token | Hex | Usage |
|---|---|---|
| `syntax-keyword` | `#B4A0E5` | Keywords |
| `syntax-string` | `#3DB95E` | Strings |
| `syntax-number` | `#E5A236` | Numbers |
| `syntax-function` | `#60A5FA` | Functions |
| `syntax-comment` | `#5C5C5C` | Comments |
| `syntax-variable` | `#EDEDED` | Variables |
| `syntax-type` | `#38BDF8` | Types |
| `syntax-operator` | `#8C8C8C` | Operators |

---

## 4. Spacing and Layout

### 4.1 Base Unit

**Base unit: 4px.** All spacing values are multiples of 4px. The 8px grid is the primary rhythm (most paddings and margins), with 4px used for fine adjustments (icon-to-text gaps, inner padding of compact elements).

### 4.2 Spacing Scale

| Token | Value | Usage Examples |
|---|---|---|
| `space-0` | 0px | Collapsed states |
| `space-0.5` | 2px | Micro-adjustments, badge padding |
| `space-1` | 4px | Icon-to-text gap, inline spacing |
| `space-2` | 8px | Small padding, gap between related items |
| `space-3` | 12px | Inner padding of compact components |
| `space-4` | 16px | Standard component padding, list item padding |
| `space-5` | 20px | Section padding (small) |
| `space-6` | 24px | Section padding (standard), panel padding |
| `space-8` | 32px | Large section gaps, card padding |
| `space-10` | 40px | Panel margins, major section breaks |
| `space-12` | 48px | Page-level top padding |
| `space-16` | 64px | Large vertical rhythm breaks |
| `space-20` | 80px | Hero spacing (rare in app context) |

### 4.3 Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | No rounding |
| `radius-sm` | 4px | Badges, inline code, small elements |
| `radius-md` | 6px | Buttons, inputs, dropdowns |
| `radius-lg` | 8px | Cards, panels, code blocks |
| `radius-xl` | 12px | Message bubbles, modals |
| `radius-2xl` | 16px | Large cards, image containers |
| `radius-full` | 9999px | Avatars, circular buttons, pills |

### 4.4 Content Max-Width

| Context | Max-Width |
|---|---|
| Message content | 520px (or 65% of chat pane width, whichever is smaller) |
| Chat pane content area | No max-width (fills available space) |
| Workspace panel content | No max-width (fills available space) |
| Settings / preferences page | 640px (centered) |
| Onboarding / auth screens | 400px (centered) |
| Modal dialogs (small) | 400px |
| Modal dialogs (medium) | 560px |
| Modal dialogs (large) | 720px |

### 4.5 macOS 3-Column Layout

```
+-------------------+----------------------------+-----------------------------+
|     Sidebar       |      Conversation          |       Workspace             |
|                   |      (Chat Pane)           |       (Right Panel)         |
+-------------------+----------------------------+-----------------------------+
     240px                  flex: 1                      flex: 0..1
   (min 200px,           (min 360px)                   (0px or 400-600px)
    max 320px)                                         (default collapsed)
```

| Column | Default Width | Min Width | Max Width | Resizable |
|---|---|---|---|---|
| Sidebar | 240px | 200px | 320px | Yes, drag handle |
| Chat Pane | flex: 1 (remaining) | 360px | No limit | Grows/shrinks |
| Workspace Panel | 0px (collapsed) | 400px (when open) | 600px | Yes, drag handle |

**Sidebar structure (top to bottom):**
1. App title / user avatar — 48px height
2. Search bar — 36px height, 12px top/bottom padding
3. Section: Pinned conversations — collapsible
4. Section: Recent conversations — scrollable
5. Section: Agents — collapsible
6. Bottom bar: Settings, new conversation — 48px height

**Behavior:**
- Sidebar collapses to icon-only (56px) below certain window widths or via toggle
- Sidebar can be completely hidden via keyboard shortcut (Cmd+Shift+S)
- Workspace panel opens with a slide-from-right animation (200ms, ease-out)
- When workspace opens, chat pane shrinks proportionally
- Dividers between columns: 1px `border-primary`, draggable

### 4.6 iOS Navigation

**Primary pattern:** Tab bar + navigation stack (not sidebar).

| Component | Specification |
|---|---|
| Tab bar | 49px height (standard iOS), max 5 tabs |
| Tab items | Conversations, Agents, Workspace, Settings |
| Navigation bar | 44px height, large title mode for root views |
| Large title | 34px, Bold (SF Pro Display), collapses on scroll |
| Back button | SF Symbol chevron.left, 17px, accent color |
| Safe area | Respect all safe area insets (notch, home indicator) |

**Navigation stack:**
```
Conversations List → Conversation Detail → (push) Workspace
                                          → (sheet) Agent Settings
                                          → (sheet) Attachments
```

**iPad adaptation:**
- Use `NavigationSplitView` with two or three columns
- Sidebar (conversations) + Detail (chat) + Inspector (workspace)
- Follows same proportions as macOS but with system-default split behavior

### 4.7 Slide-Over Panel Proportions

The workspace panel (code editor, preview, terminal) slides over from the right.

| Viewport Width | Panel Behavior |
|---|---|
| < 768px (mobile) | Full-screen sheet, swipe down to dismiss |
| 768-1024px (tablet) | 60% width overlay with scrim |
| 1024-1440px (small desktop) | Inline panel, 400px |
| > 1440px (large desktop) | Inline panel, 480-600px |

**Split ratios when workspace is open:**
- Default: 55% chat / 45% workspace
- User-adjustable via drag handle between 35% chat / 65% workspace and 70% chat / 30% workspace
- Minimum chat width: 360px (below this, workspace becomes a full overlay)

---

## 5. Component Patterns

### 5.1 Message Bubbles

#### Sent Messages (User)

```
                                     +---------------------------+
                                     | Message text here that    |
                                     | can wrap across multiple  |
                                     | lines as needed.          |
                                     |                    12:34  |
                                     +---------------------------+
```

| Property | Value |
|---|---|
| Background | `bg-message-sent` (`#F0F0F0` light / `#2A2A2A` dark) |
| Text color | `text-primary` |
| Border radius | 12px all corners, 4px bottom-right |
| Padding | 10px 14px |
| Max width | 65% of chat pane or 520px |
| Alignment | Right-aligned |
| Font | `text-md` (15px), Regular 400 |
| Timestamp | `text-xs` (11px), `text-secondary`, bottom-right inside bubble |
| Avatar | Not shown for sent messages |
| Spacing between consecutive sent | 2px (grouped), 8px (different timestamp group) |

#### Received Messages (Agent / Other)

```
  +--+  +---------------------------+
  |av|  | Message text here that    |
  |  |  | can wrap across multiple  |
  +--+  | lines as needed.          |
         |  12:34                    |
         +---------------------------+
```

| Property | Value |
|---|---|
| Background | `#FFFFFF` with 1px `border-secondary` (light) / `#1C1C1C` with 1px `border-primary` (dark) |
| Text color | `text-primary` |
| Border radius | 12px all corners, 4px bottom-left |
| Padding | 10px 14px |
| Max width | 65% of chat pane or 520px |
| Alignment | Left-aligned |
| Font | `text-md` (15px), Regular 400 |
| Timestamp | `text-xs` (11px), `text-secondary`, bottom-left inside bubble |
| Avatar | 28px circle, 8px gap to bubble, top-aligned with first message in group |
| Agent ring | 2px ring in agent accent color around avatar |
| Spacing between consecutive received | 2px (grouped), 8px (different timestamp group) |

#### Message Grouping Rules

- Messages from the same sender within 2 minutes are grouped (2px gap, no repeat avatar)
- The avatar shows only on the first message in a group
- Timestamps show only on the last message in a group (inside the bubble)
- A date separator appears between messages on different calendar days
- Date separator: centered text, `text-xs`, `text-tertiary`, horizontal rules on both sides

#### Rich Content in Messages

| Content Type | Treatment |
|---|---|
| Links | Accent color, underline on hover only |
| Code inline | `code-inline` style, `bg-tertiary` background |
| Code blocks | Full-width within bubble, `bg-secondary`, syntax highlighted, copy button top-right |
| Images | Rounded corners (`radius-lg`), max 300px width, click to expand |
| Files | Compact pill: icon + filename + size, click to download |
| Agent thinking | Separate component (see Section 9) |

### 5.2 Conversation List Items

```
+-----------------------------------------------------------+
| [avatar]  Conversation Title              timestamp       |
|           Last message preview...         [badge] [pin]   |
+-----------------------------------------------------------+
```

| Property | Value |
|---|---|
| Height | 68px (with 2 lines of preview) |
| Padding | 12px horizontal, 10px vertical |
| Avatar | 40px circle, left-aligned |
| Title | `text-base` (14px), Medium 500, truncate with ellipsis |
| Preview | `text-sm` (12px), Regular 400, `text-secondary`, max 1 line, truncate |
| Timestamp | `text-xs` (11px), `text-tertiary`, top-right |
| Unread badge | 20px circle, `accent-primary` bg, white text, `text-2xs` (10px), Semibold |
| Pin indicator | 12px pin icon, `text-tertiary`, top-right below timestamp |
| Platform badge | 14px pill, platform color, next to avatar (bottom-right overlap) |
| Hover state | `bg-tertiary` background |
| Selected state | `bg-tertiary` + left 2px `accent-primary` border |
| Swipe actions (iOS) | Left: Pin/Unpin. Right: Mute, Archive, Delete |
| Divider | 1px `border-primary`, inset from left by 64px (past avatar) |

**Status indicators on avatar:**
- Online: 10px circle, `semantic-success`, positioned bottom-right of avatar with 2px white border
- Agent working: Pulsing dot animation in agent accent color
- Offline / idle: No indicator shown (absence is the default)

### 5.3 Input Bar (Message Compose)

```
+-----------------------------------------------------------+
| [+]  Type a message...            [cmd] [send/stop]       |
+-----------------------------------------------------------+
```

| Property | Value |
|---|---|
| Container height | 48px minimum, grows with content up to 160px |
| Container background | `bg-primary` |
| Top border | 1px `border-primary` |
| Padding | 8px horizontal, 8px vertical |
| Input field background | `bg-input` |
| Input field border-radius | `radius-lg` (8px), grows to `radius-xl` (12px) when multi-line |
| Input field padding | 10px 14px |
| Input font | `text-base` (14px), Regular 400 |
| Placeholder text | "Message..." in `text-tertiary` |
| Attachment button [+] | 32px touch target, `text-secondary` icon, left of input |
| Command palette button [/] | 28px, `text-secondary`, inside input right side |
| Send button | 32px circle, `accent-primary` bg, white arrow icon. Appears only when input has content |
| Stop button | 32px circle, `semantic-error` bg, white square icon. Appears when agent is generating |
| Keyboard shortcut hint | "Cmd+Enter to send" — `text-2xs`, `text-tertiary`, below input on first use |

**Attachment menu (opens above input):**
- Compact grid: File, Image, Code snippet, Voice note
- Each option: 44px icon + label, in a 2x2 or horizontal strip
- Background: `bg-elevated` with shadow
- Border radius: `radius-lg`

**Command palette (opens above input when typing `/`):**
- List of available commands, filtered as user types
- Each item: icon + command name + description
- Highlight with `bg-tertiary`, accent color icon on selection
- Max height: 240px, scrollable

### 5.4 Navigation / Sidebar

**macOS sidebar anatomy:**

```
+-------------------------+
| [logo]  Open Raccoon    |   -- 48px, app header
+-------------------------+
| [search icon] Search    |   -- 36px, search bar
+-------------------------+
|  PINNED                 |   -- section header
|  [av] Design Chat       |
|  [av] Deploy Agent      |
+-------------------------+
|  RECENT                 |   -- section header
|  [av] Code Review       |
|  [av] Bug Fix #412      |
|  [av] Landing Page      |
|  ...                    |   -- scrollable
+-------------------------+
|  AGENTS                 |   -- section header
|  [ic] Raccoon (default) |
|  [ic] Code Agent        |
|  [ic] Research Agent    |
+-------------------------+
| [gear] Settings  [+]   |   -- 48px, bottom bar
+-------------------------+
```

| Property | Value |
|---|---|
| Background | `bg-secondary` |
| Width | 240px default (see layout section) |
| Section header | `text-xs` (11px), Semibold 600, `text-tertiary`, uppercase, 8px bottom padding, 16px top padding |
| List item height | 36px |
| List item padding | 8px horizontal, 4px vertical |
| List item icon/avatar | 24px, 8px gap to text |
| List item text | `text-sm` (12px), Medium 500 for macOS sidebar density |
| Hover | `bg-tertiary` background, `radius-md` |
| Selected | `bg-tertiary`, `text-primary`, left 2px `accent-primary` inset border |
| Scrollbar | Overlay style, 6px wide, appears on hover/scroll only |
| Collapse animation | 200ms ease-out, content fades then width shrinks |

### 5.5 Workspace Panel (Code Editor, Preview, Terminal)

```
+-------------------------------------------+
| [tabs: Code | Preview | Terminal]  [x]    |   -- 40px tab bar
+-------------------------------------------+
|                                           |
|  // Code editor content area              |
|  function hello() {                       |
|    return "world";                        |
|  }                                        |
|                                           |
+-------------------------------------------+
| [terminal output area]                    |   -- resizable, 120px min
| $ npm run build                           |
| > Build completed in 2.3s                 |
+-------------------------------------------+
```

| Property | Value |
|---|---|
| Tab bar height | 40px |
| Tab item | `text-sm` (12px), Medium 500, 12px horizontal padding |
| Active tab | `text-primary`, 2px bottom `accent-primary` border |
| Inactive tab | `text-secondary`, no border |
| Close button | 16px X icon, top-right, `text-tertiary`, hover `text-primary` |
| Code editor font | `code-block-lg` (14px), `font-mono` |
| Code editor line height | 24px |
| Code editor padding | 16px top/bottom, 0px left (gutter handles spacing) |
| Gutter (line numbers) | 48px wide, `text-tertiary`, right-aligned, `bg-secondary` |
| Preview pane | Live iframe or rendered output, `bg-primary` |
| Terminal font | `code-block` (13px), `font-mono` |
| Terminal background | `#1A1A1A` (always dark, regardless of app theme) |
| Terminal text | `#CCCCCC` default, `#3DB95E` for success, `#F14C4C` for errors |
| Divider between editor/terminal | 4px draggable, `border-primary` |

---

## 6. Agent Status Messages

Fun, minimalist, developer-humor status messages. These appear as small text indicators in the chat view and in the sidebar when an agent is working.

### 6.1 Status Message Style

| Property | Value |
|---|---|
| Container | Inline within chat, left-aligned below last message |
| Text | `text-sm` (12px), Regular 400, `text-secondary` |
| Icon | 14px animated icon (see below), agent accent color, 6px gap to text |
| Animation | Subtle pulse or shimmer on the icon. Text itself does not animate |
| Dismissal | Replaced by the actual response when complete |

### 6.2 Message Categories and Examples

**Thinking / Reasoning**
- "thinking about this..."
- "untangling your requirements..."
- "consulting the raccoon council..."
- "reading between the lines..."
- "pondering the edge cases..."
- "considering 14 possible approaches, discarding 13..."
- "having a quick existential crisis about types..."

**Coding / Building**
- "writing code that hopefully compiles..."
- "brewing your landing page..."
- "refactoring things you didn't ask me to refactor..."
- "adding semicolons in all the right places..."
- "building something with unreasonable attention to detail..."
- "reading your spaghetti code... trying not to judge..."
- "deleting my first attempt. you'll never know."
- "arguing with the linter..."

**Generating Content**
- "drafting something worth reading..."
- "choosing words carefully..."
- "writing, rewriting, re-rewriting..."
- "making your bullet points bulletproof..."
- "turning caffeine into documentation..."
- "generating prose that doesn't sound like a robot..."

**Searching / Research**
- "digging through the internet..."
- "searching for answers in the digital void..."
- "reading docs so you don't have to..."
- "cross-referencing sources like a paranoid librarian..."
- "going down a rabbit hole for you..."
- "asking the hive mind..."

**Deploying / Executing**
- "shipping it..."
- "deploying to prod on a friday. you asked for this."
- "running your build. fingers crossed."
- "testing in production like a professional..."
- "pushing to the void and hoping for the best..."
- "watching the CI pipeline like a hawk..."

**Error Recovery**
- "hmm, that didn't work. plan B."
- "retrying with more optimism..."
- "something broke. fixing it before you notice."
- "the raccoon tripped. getting back up."
- "adjusting expectations..."

### 6.3 Status Message Rotation Rules

- Randomly select from the appropriate category
- Never repeat the same message twice in a row within a session
- For operations lasting > 10 seconds, cycle to a new message every 8-12 seconds
- Each message should feel like a brief, dry aside - not a progress bar
- Keep them short: 6 words max as a target, 10 words as a hard limit

---

## 7. Animation and Motion

### 7.1 Core Principles

1. **Purposeful only.** Every animation must serve orientation (where did this come from?), feedback (did my action register?), or continuity (what changed?).
2. **Fast by default.** Most transitions under 200ms. Nothing over 300ms except page-level transitions.
3. **Ease-out for entrances, ease-in for exits.** Things arrive decelerating (natural), things leave accelerating (getting out of the way).
4. **No bouncing, no overshoot.** This is a calm tool, not a playful toy.

### 7.2 Duration Scale

| Token | Duration | Usage |
|---|---|---|
| `duration-instant` | 100ms | Hover states, opacity changes, micro-interactions |
| `duration-fast` | 150ms | Button presses, toggles, small element transitions |
| `duration-normal` | 200ms | Panel opens/closes, sidebar toggle, tab switches |
| `duration-slow` | 300ms | Page transitions, modal open/close, workspace slide |
| `duration-slower` | 400ms | Full-screen overlays, onboarding transitions |

### 7.3 Easing Curves

| Token | Value | Usage |
|---|---|---|
| `ease-default` | `cubic-bezier(0.25, 0.1, 0.25, 1.0)` | General purpose, subtle ease |
| `ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` | Elements entering view |
| `ease-in` | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` | Elements exiting view |
| `ease-in-out` | `cubic-bezier(0.4, 0.0, 0.2, 1.0)` | Elements moving position |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1.0)` | Reserved: only for send button press feedback |

### 7.4 Specific Animations

**Message Send:**
1. User presses send (or Cmd+Enter)
2. Input field clears instantly
3. New message bubble fades in from bottom-right: `duration-fast`, `ease-out`, translate-y from 8px to 0px + opacity 0 to 1
4. Send button does a brief scale pulse: 1.0 -> 0.9 -> 1.0, `duration-fast`

**Message Receive:**
1. Typing indicator appears (see Section 9)
2. Typing indicator fades out, message fades in: `duration-fast`, `ease-out`, translate-y from 4px to 0px + opacity 0 to 1
3. If the message contains streaming text, characters appear progressively (not animated, just appended)

**Typing Indicator:**
- Three dots in a horizontal row, 6px each, `text-tertiary` color
- Sequential opacity pulse: each dot animates 0.4 -> 1.0 -> 0.4 opacity
- Stagger: 150ms between each dot
- Full cycle: 1200ms
- Appears inside a small "bubble" matching received message style, 40px width

**Sidebar Toggle (collapse/expand):**
- Duration: `duration-normal` (200ms)
- Easing: `ease-in-out`
- Content fades out first (100ms), then width animates
- On expand, width animates first, then content fades in (100ms)

**Workspace Panel Open:**
- Slides in from right edge
- Duration: `duration-slow` (300ms)
- Easing: `ease-out`
- Slight opacity fade: 0.8 -> 1.0 concurrent with slide
- Chat pane shrinks proportionally during the same 300ms

**Tab Switching (workspace):**
- Cross-fade: outgoing content fades out (100ms), incoming fades in (100ms)
- No horizontal slide. Instant content swap with soft opacity transition
- Active tab indicator (bottom border) slides horizontally: `duration-fast`, `ease-in-out`

**Modal Open/Close:**
- Backdrop: opacity 0 -> 0.5 (black), `duration-normal`
- Modal: scale 0.95 -> 1.0 + opacity 0 -> 1, `duration-normal`, `ease-out`
- Close: reverse, `duration-fast`, `ease-in`

**Conversation List Item Interactions:**
- Hover: background color transition, `duration-instant`
- Swipe (iOS): spring physics, follows finger with inertia
- Delete: height collapses to 0, `duration-normal`, `ease-in`, item above/below shift up smoothly
- New message arrival: subtle flash of `bg-tertiary` on the list item, then returns to normal

### 7.5 Reduced Motion

When the user has `prefers-reduced-motion: reduce` enabled:
- All duration values reduce to 0ms (instant transitions)
- Typing indicator uses static "..." text instead of animated dots
- Skeleton loaders use a solid color instead of shimmer
- The send button pulse is removed
- Panel transitions become instant show/hide

---

## 8. Branding

### 8.1 Logo Concept: Abstract Geometric Raccoon

**Design direction:** A raccoon face abstracted into clean geometric shapes. Not cute, not cartoonish. Think: a tech company logo that happens to be inspired by a raccoon.

**Construction principles:**
- Built from circles, arcs, and straight lines on a grid
- The iconic raccoon mask (dark patches around the eyes) is the key recognizable element
- Two angled shapes suggesting the mask, with negative space forming the face
- Can be reduced to a single mark that works at 16px (favicon) and 512px (app icon)
- Monochrome by default. Uses `text-primary` on `bg-primary`

**Logo variants:**

| Variant | Usage |
|---|---|
| Mark only | App icon, favicon, loading screen, avatar fallback |
| Mark + wordmark | Sidebar header, marketing, about screen |
| Wordmark only | Settings page header, legal |

**Wordmark typography:**
- "Open Raccoon" or "raccoon" (lowercase)
- Set in Inter, Semibold 600, with -0.02em letter spacing
- If using "raccoon" alone, the double-o can subtly reference the raccoon eyes (two circles)

**Logo clear space:**
- Minimum clear space: 1x the height of the mark on all sides
- Never place the logo on busy backgrounds

**App icon:**
- macOS: Rounded rectangle (system squircle), geometric raccoon mark centered, `bg-primary` background, subtle shadow
- iOS: Same mark, slightly larger relative to the icon boundary
- The mark should feel like it belongs next to Linear, Notion, Things, and Raycast in a dock

### 8.2 Brand Colors for Marketing

Outside the app UI, marketing materials may use extended brand colors:

| Color | Hex | Usage |
|---|---|---|
| Brand Violet | `#6E56CF` | Primary brand color for marketing |
| Brand Dark | `#171717` | Dark backgrounds for marketing |
| Brand Light | `#FAFAFA` | Light backgrounds for marketing |
| Brand White | `#FFFFFF` | Clean backgrounds |

---

## 9. AI Loading and Thinking States

### 9.1 Design Philosophy

Research (from Jakob Nielsen's "Think-Time UX", the ShapeofAI "Stream of Thought" pattern, and streaming UX studies in 2025-2026) consistently shows:

1. **Operational transparency beats progress bars.** Users tolerate waiting when they understand what the system is doing. Show the AI's process, not a spinner.
2. **Streaming text reduces perceived latency by 40-60%.** Token-by-token display makes sub-second waits feel instant and multi-second waits feel productive.
3. **The "elevator mirror effect."** Give users something to look at while waiting: show intermediate reasoning, tool calls, or a plan. This reduces perceived wait time even if actual time is unchanged.
4. **Progressive disclosure of thinking.** Start compact, let users expand to see full detail. Not everyone wants to see the chain of thought.

### 9.2 Thinking State Tiers

Based on expected duration, use different treatments:

#### Tier 1: Quick Response (< 2 seconds)

- Show typing indicator (three animated dots) inside a message bubble
- No status text
- Feels like a person typing

#### Tier 2: Standard Processing (2-10 seconds)

- Typing indicator appears for the first 1 second
- Then transitions to a status message (from Section 6)
- Status message in `text-sm`, `text-secondary`, with a subtle pulsing dot in agent accent color
- When response begins streaming, status message fades out and streaming text fades in

#### Tier 3: Extended Processing (10-60 seconds)

- Status message appears immediately
- Below the status message, a collapsible "stream of thought" panel:
  - Default: collapsed, showing a one-line summary that updates
  - Expanded: shows step-by-step reasoning, tool calls, code execution
  - Toggle: small chevron or "show details" link
- Status message rotates every 8-12 seconds (see Section 6.3)
- A thin progress shimmer (horizontal gradient animation) runs across the top of the thinking container

#### Tier 4: Long-Running Task (60+ seconds)

- Full "task progress" view:
  - Vertical step list showing completed, in-progress, and upcoming steps
  - Each step: icon (checkmark/spinner/circle) + label + optional detail line
  - Completed steps: `semantic-success` checkmark, `text-secondary` text
  - In-progress step: spinning indicator in agent accent color, `text-primary` text
  - Upcoming steps: empty circle, `text-tertiary` text
- Elapsed time shown in `text-xs`, `text-tertiary`
- Cancel button available: "Stop" in `semantic-error` color
- The chat remains interactive: user can scroll up, read previous messages

### 9.3 Stream of Thought Component

```
+--+  +-----------------------------------------------+
|av|  | thinking about this...                    [v]  |   -- collapsed
+--+  +-----------------------------------------------+

+--+  +-----------------------------------------------+
|av|  | thinking about this...                    [^]  |   -- expanded
+--+  |                                               |
      |  > Analyzing message intent                   |
      |  > Searching codebase for relevant files      |
      |  > Found 3 matching files                     |
      |  > Generating response...                     |
      +-----------------------------------------------+
```

| Property | Value |
|---|---|
| Container background | `bg-secondary` (light) / `bg-tertiary` (dark) |
| Container border | 1px `border-secondary` |
| Container border-radius | `radius-xl` (12px) |
| Container padding | 10px 14px |
| Status text | `text-sm`, `text-secondary`, with pulsing dot |
| Detail lines | `text-sm`, `text-tertiary`, `font-mono` for tool calls |
| Chevron toggle | 14px, `text-tertiary`, hover `text-secondary` |
| Shimmer | Horizontal gradient: transparent -> `accent-primary` at 10% opacity -> transparent. Moves left to right over 2s, repeating. 2px height, pinned to top of container |
| Expand animation | Height auto-animate, `duration-normal`, `ease-out` |
| Max expanded height | 200px, then scrollable |

### 9.4 Streaming Text

When the AI response streams in token-by-token:

| Property | Value |
|---|---|
| Cursor | A 2px-wide, 16px-tall blinking cursor in `text-tertiary`, blinks at 530ms interval |
| Text appearance | No animation per character. Characters simply append. The cursor moves with the last character |
| Scroll behavior | Chat auto-scrolls to keep the latest text visible. If user manually scrolls up, auto-scroll pauses and a "scroll to bottom" pill appears |
| Code blocks | Stream as text, then syntax-highlight the full block once the closing ``` is received |
| Completion | Cursor fades out over `duration-fast`. Timestamps and action buttons (copy, retry) fade in |

### 9.5 Scroll-to-Bottom Pill

Appears when user has scrolled away from the latest message during streaming.

| Property | Value |
|---|---|
| Position | Fixed, centered horizontally, 16px above the input bar |
| Shape | Pill, `radius-full` |
| Background | `bg-elevated` with shadow (`0 2px 8px rgba(0,0,0,0.12)`) |
| Text | "New messages" or down-arrow icon, `text-sm`, `text-secondary` |
| Click | Smooth scroll to bottom, pill fades out |
| Badge | If multiple messages arrived while scrolled away, show count |

---

## Appendix A: Design Token Summary (CSS Custom Properties)

```css
:root {
  /* Colors - Light Mode */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #FAFAFA;
  --color-bg-tertiary: #F5F5F5;
  --color-bg-elevated: #FFFFFF;
  --color-bg-input: #F5F5F5;
  --color-bg-message-sent: #F0F0F0;
  --color-bg-message-received: #FFFFFF;
  --color-border-primary: #E5E5E5;
  --color-border-secondary: #EBEBEB;
  --color-border-focus: #171717;
  --color-text-primary: #171717;
  --color-text-secondary: #737373;
  --color-text-tertiary: #A3A3A3;
  --color-text-inverse: #FFFFFF;
  --color-accent-primary: #6E56CF;
  --color-accent-hover: #5B44B2;
  --color-accent-subtle: #F3F0FF;
  --color-success: #2D7D46;
  --color-success-bg: #EDFBF0;
  --color-warning: #C17A1A;
  --color-warning-bg: #FFF8EB;
  --color-error: #CD3131;
  --color-error-bg: #FDECEC;
  --color-info: #3B82F6;
  --color-info-bg: #EFF6FF;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  --text-2xs: 0.625rem;
  --text-xs: 0.6875rem;
  --text-sm: 0.75rem;
  --text-base: 0.875rem;
  --text-md: 0.9375rem;
  --text-lg: 1rem;
  --text-xl: 1.125rem;
  --text-2xl: 1.25rem;
  --text-3xl: 1.5rem;
  --text-4xl: 1.875rem;

  /* Spacing */
  --space-0: 0px;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* Border Radius */
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.16);

  /* Motion */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 400ms;
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-in: cubic-bezier(0.4, 0.0, 1.0, 1.0);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1.0);
}

/* Dark Mode */
[data-theme="dark"] {
  --color-bg-primary: #161616;
  --color-bg-secondary: #1C1C1C;
  --color-bg-tertiary: #232323;
  --color-bg-elevated: #1C1C1C;
  --color-bg-input: #232323;
  --color-bg-message-sent: #2A2A2A;
  --color-bg-message-received: #1C1C1C;
  --color-border-primary: #2A2A2A;
  --color-border-secondary: #333333;
  --color-border-focus: #E5E5E5;
  --color-text-primary: #EDEDED;
  --color-text-secondary: #8C8C8C;
  --color-text-tertiary: #5C5C5C;
  --color-text-inverse: #171717;
  --color-accent-primary: #6E56CF;
  --color-accent-hover: #8B76E0;
  --color-accent-subtle: #251F3A;
  --color-success: #3DB95E;
  --color-success-bg: #1A2E1F;
  --color-warning: #E5A236;
  --color-warning-bg: #2E2515;
  --color-error: #F14C4C;
  --color-error-bg: #2E1717;
  --color-info: #60A5FA;
  --color-info-bg: #172035;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

---

## Appendix B: Accessibility Requirements

| Requirement | Standard | Notes |
|---|---|---|
| Text contrast (body) | WCAG AA 4.5:1 minimum | `#171717` on `#FFFFFF` ~ 16.5:1. Passes. |
| Text contrast (secondary) | WCAG AA 4.5:1 minimum | `#737373` on `#FFFFFF` ~ 4.6:1. Passes (verify exact ratio during implementation). |
| Text contrast (tertiary) | WCAG AA for large text (3:1) | `#A3A3A3` on `#FFFFFF` ~ 2.6:1. Does not meet AA for normal text. Tertiary text is decorative/supplemental only. Use sparingly and never for essential information. |
| Focus indicators | 2px outline, `accent-primary`, 2px offset | All interactive elements must show visible focus |
| Touch targets | 44px minimum (iOS HIG) | All tap targets on mobile |
| Reduced motion | `prefers-reduced-motion` support | See Section 7.5 |
| Screen reader | Semantic HTML, ARIA labels | All interactive components |
| Font scaling | Support Dynamic Type (iOS) and browser zoom (web) | Layout must not break at 200% zoom |

---

## Appendix C: Iconography

| Property | Value |
|---|---|
| Icon set | SF Symbols (Apple platforms), Lucide (web) |
| Default size | 16px (sidebar), 20px (toolbar), 24px (hero) |
| Stroke weight | 1.5px (matches Inter's visual weight at regular) |
| Color | `text-secondary` default, `text-primary` on hover/active, `accent-primary` for active navigation |
| Style | Outline only. No filled icons except for active tab bar items on iOS |

---

*End of Design System Specification.*
