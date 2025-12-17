# BantuBuzz Platform - Color Usage Guideline

**Version:** 1.0
**Last Updated:** December 17, 2025
**Powered by:** Bakoena Technologies

---

## Introduction

This document defines the official color palette and usage guidelines for the BantuBuzz platform. These colors are derived from the official Brand Guidelines with additional platform-specific colors for UI consistency.

---

## Official Color Palette

### 1. Primary Brand Colors

#### **Primary Olive-Green** `#ccdb53`
- **RGB:** (204, 219, 83)
- **CMYK:** (24, 1, 84, 0)
- **Usage:** Main brand color, primary buttons, highlights, active states
- **Psychology:** Evokes mystery and depth, ideal for captivating and intriguing campaigns
- **Tailwind Class:** `bg-primary`, `text-primary`, `border-primary`

#### **Dark Olive** `#838a36`
- **RGB:** (131, 138, 54)
- **CMYK:** (51, 32, 100, 10)
- **Usage:** Secondary buttons, subtle backgrounds, complementary elements
- **Psychology:** Serene, calming twilight tones, perfect for soothing campaigns
- **Tailwind Class:** `bg-primary-dark`, `text-primary-dark`

#### **Vibrant Lime** `#c8ff09`
- **RGB:** (200, 255, 9)
- **CMYK:** (27, 0, 100, 0)
- **Usage:** Accent color for attention-grabbing elements, CTAs, notifications
- **Psychology:** Radiates lively energy, ideal for uplifting campaigns
- **Tailwind Class:** `bg-accent-lime`, `text-accent-lime`
- **⚠️ Warning:** Use sparingly - only for elements that need immediate attention

#### **Light Background** `#ebf4e5`
- **RGB:** (235, 244, 229)
- **CMYK:** (7, 0, 11, 0)
- **Usage:** Page backgrounds, card backgrounds, subtle sections
- **Psychology:** Clean, fresh, calming
- **Tailwind Class:** `bg-primary-light`, `bg-light`

---

### 2. Platform UI Colors

#### **Navy Dark** `#1F2937` (Platform-Specific)
- **RGB:** (31, 41, 55)
- **Usage:**
  - Dark sections (e.g., "Join as a Brand" CTA background)
  - Navigation bars
  - Footer backgrounds
  - Text on light backgrounds
  - Professional/corporate elements
- **Psychology:** Trust, professionalism, stability
- **Tailwind Class:** `bg-dark`, `text-dark`
- **Note:** This is NOT from the brand guidelines but is essential for platform UI consistency

#### **Black** `#000000`
- **Usage:** Typography (headings, body text), icons, borders
- **Tailwind Class:** `text-black`, `bg-black`

#### **White** `#FFFFFF`
- **Usage:** Card backgrounds, button text, clean sections
- **Tailwind Class:** `text-white`, `bg-white`

#### **Gray Shades** (Neutral Palette)
- **Gray 100:** `#F3F4F6` - Very light gray for subtle backgrounds
- **Gray 200:** `#E5E7EB` - Light borders, disabled states
- **Gray 300:** `#D1D5DB` - Borders, dividers
- **Gray 500:** `#6B7280` - Secondary text
- **Gray 600:** `#4B5563` - Body text
- **Gray 700:** `#374151` - Headings on light backgrounds
- **Gray 900:** `#111827` - Darkest text

---

## Color Usage by Component

### Navigation & Header
- **Background:** `bg-white` or `bg-dark` (Navy `#1F2937`)
- **Logo:** Primary brand colors
- **Text:** `text-gray-900` on white, `text-white` on dark
- **Active Links:** `text-primary` (`#ccdb53`)

### Buttons

#### Primary Button
- **Background:** `bg-primary` (`#ccdb53`)
- **Text:** `text-dark` (Navy `#1F2937`)
- **Hover:** `bg-primary/90` (90% opacity)
- **Example:** Search button, "Send message" on TikTok section

#### Secondary Button
- **Background:** `bg-dark` (`#1F2937`)
- **Text:** `text-white`
- **Hover:** `bg-gray-800`
- **Example:** "Send message" on Featured section

#### Accent Button (Use Sparingly)
- **Background:** `bg-accent-lime` (`#c8ff09`)
- **Text:** `text-dark`
- **Hover:** `bg-accent-lime/90`
- **Example:** Special promotions, limited-time offers

#### Ghost Button
- **Background:** Transparent
- **Border:** `border-gray-300` or `border-primary`
- **Text:** `text-gray-900` or `text-primary`
- **Hover:** `bg-gray-100`

### Cards

#### Standard Card
- **Background:** `bg-white`
- **Border:** None or `border-gray-200`
- **Shadow:** `shadow-sm hover:shadow-md`

#### Highlighted Card (Instagram Section)
- **Background:** `bg-primary` (`#ccdb53`)
- **Text:** `text-gray-900`
- **Button:** `bg-white` with `text-dark`

#### Creator Profile Card
- **Background:** `bg-white`
- **Image Container:** `bg-gray-100` (as placeholder)
- **Category Badge:** `border-gray-300` with `text-gray-900`

### Sections & Backgrounds

#### Page Background
- **Light Pages:** `bg-[#f5f5f0]` (warm beige) or `bg-primary-light` (`#ebf4e5`)
- **Dark Sections:** `bg-dark` (`#1F2937`)
- **Accent Sections:** `bg-primary` (`#ccdb53`)

#### CTA Sections
- **Brand CTA:** `bg-dark` with `bg-primary` button
- **Creator CTA:** `bg-primary` with `bg-dark` button

### Text Colors

#### Headings
- **Primary:** `text-gray-900` or `text-black`
- **On Dark Background:** `text-white`
- **Accent:** `text-primary` (for highlighted words like "Collaborate")

#### Body Text
- **Primary:** `text-gray-600` or `text-gray-700`
- **Secondary:** `text-gray-500`
- **On Dark:** `text-gray-300`
- **Brand Color:** `text-primary` (`#ccdb53`) for subtitles and highlights

#### Links
- **Default:** `text-gray-900`
- **Hover:** `hover:underline`
- **Active:** `text-primary`

### Forms & Inputs

#### Input Fields
- **Background:** `bg-white`
- **Border:** `border-gray-200`
- **Focus:** `focus:border-primary focus:ring-primary`
- **Text:** `text-gray-900`
- **Placeholder:** `placeholder-gray-400` or `placeholder-primary`

#### Select Dropdowns
- **Background:** `bg-white` or `bg-transparent`
- **Text:** `text-primary` (for consistency with brand)

### Status Colors

#### Success
- **Color:** `#22C55E` (Green)
- **Usage:** Success messages, completed status
- **Tailwind:** `text-success`, `bg-success`

#### Warning
- **Color:** `#F59E0B` (Amber)
- **Usage:** Warning messages, pending status
- **Tailwind:** `text-warning`, `bg-warning`

#### Error
- **Color:** `#EF4444` (Red)
- **Usage:** Error messages, failed status
- **Tailwind:** `text-error`, `bg-error`

---

## Color Combinations (Do's and Don'ts)

### ✅ Recommended Combinations

1. **Primary on White**
   - Background: `bg-white`
   - Button: `bg-primary` with `text-dark`
   - Text: `text-gray-900`

2. **Dark on Primary**
   - Background: `bg-primary`
   - Button: `bg-dark` with `text-white`
   - Text: `text-gray-900`

3. **Primary on Dark**
   - Background: `bg-dark`
   - Button: `bg-primary` with `text-dark`
   - Text: `text-white`

4. **White on Dark**
   - Background: `bg-dark`
   - Button: `bg-white` with `text-dark`
   - Text: `text-white`

### ❌ Avoid These Combinations

1. **Vibrant Lime as Background** - Too bright, use only as accent
2. **Primary Text on Light Background** - Low contrast, hard to read
3. **Dark Olive as Primary Button** - Not distinctive enough
4. **Lime Button on Primary Background** - Clashing colors

---

## Accessibility Guidelines

### Contrast Ratios (WCAG 2.1 Level AA)

- **Normal Text:** Minimum 4.5:1 contrast ratio
- **Large Text (18pt+):** Minimum 3:1 contrast ratio
- **UI Components:** Minimum 3:1 contrast ratio

### Tested Combinations

✅ **Passes AA:**
- White text on Navy Dark (`#1F2937`)
- Dark text on Primary (`#ccdb53`)
- Gray 900 text on White
- White text on Primary Dark (`#838a36`)

⚠️ **Use with Caution:**
- Primary text (`#ccdb53`) on White - Use for large text only
- Lime text (`#c8ff09`) on White - Use for accents only

❌ **Fails AA:**
- Primary Light (`#ebf4e5`) text on White
- Gray 400 on White for normal text

---

## Platform-Specific Color Usage

### Home Page
- **Hero Background:** `bg-[#f5f5f0]` (warm beige)
- **Hero Text:** `text-black` with `text-primary` for "Collaborate"
- **Search Bar:** `bg-white` with `bg-primary` button
- **Featured Cards:** `bg-white`
- **Instagram Section Cards:** `bg-primary`
- **TikTok Section Cards:** `bg-white` with `bg-primary` buttons
- **"Join as Brand" CTA:** `bg-dark` with `bg-primary` button
- **"Join as Creator" CTA:** `bg-primary` with `bg-dark` button

### Dashboard Pages
- **Sidebar:** `bg-dark` or `bg-white` with `text-gray-900`
- **Active Menu Item:** `bg-primary` or `text-primary`
- **Content Area:** `bg-white` or `bg-gray-50`
- **Cards:** `bg-white` with `shadow-sm`

### Creator Profiles
- **Profile Header:** `bg-primary` or `bg-white`
- **Portfolio Cards:** `bg-white`
- **Action Buttons:** `bg-primary` (hire) or `bg-dark` (message)
- **Stats:** `text-gray-900` with `text-primary` for numbers

### Brand Dashboard
- **Wallet Card:** `bg-primary-light` or `bg-white`
- **Collaboration Cards:** `bg-white`
- **Payment Button:** `bg-primary`
- **Complete Button:** `bg-dark`

---

## Implementation in Tailwind Config

```javascript
colors: {
  // Brand colors from guidelines
  primary: {
    DEFAULT: '#ccdb53',  // PRIMARY - olive/yellow-green
    light: '#ebf4e5',    // Light background
    dark: '#838a36',     // Dark olive
  },
  accent: {
    lime: '#c8ff09',     // Vibrant lime - use sparingly
  },
  // Platform UI color
  dark: {
    DEFAULT: '#1F2937',  // Navy dark - platform UI
    light: '#374151',
  },
  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
}
```

---

## Typography & Font Guidelines

### Official Typeface (From Brand Guidelines)

#### **Poppins** - Primary Font Family
Poppins is the official typeface for BantuBuzz. It is modern, clean, and highly readable across all devices and sizes.

**Font Weights Available:**
- **Poppins Thin** (100) - Very light decorative text
- **Poppins ExtraLight** (200) - Light decorative elements
- **Poppins Light** (300) - Subtle text elements
- **Poppins Regular** (400) - Body text, paragraphs
- **Poppins Medium** (500) - Emphasized body text
- **Poppins SemiBold** (600) - Subheadings, labels
- **Poppins Bold** (700) - Headings, CTAs
- **Poppins ExtraBold** (800) - Hero text, major headings
- **Poppins Black** (900) - Display text (use sparingly)

**Character Set:**
```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789!@#$%^&*()-+/?
```

---

### Typography Hierarchy

#### **Display Text (Hero/Landing Pages)**
- **Font:** Poppins Bold (700) or ExtraBold (800)
- **Size:** 48-72px (3rem-4.5rem)
- **Line Height:** 1.1-1.2
- **Color:** `text-gray-900` or `text-black`
- **Usage:** Main hero headings, landing page titles
- **Example:** "Find Influencers to Collaborate With"
- **Tailwind:** `text-5xl md:text-6xl lg:text-7xl font-bold`

#### **H1 - Primary Headings**
- **Font:** Poppins Bold (700)
- **Size:** 36-48px (2.25rem-3rem)
- **Line Height:** 1.2
- **Color:** `text-gray-900` or `text-black`
- **Usage:** Page titles, section headers
- **Tailwind:** `text-4xl font-bold`

#### **H2 - Secondary Headings**
- **Font:** Poppins Bold (700)
- **Size:** 28-36px (1.75rem-2.25rem)
- **Line Height:** 1.3
- **Color:** `text-gray-900`
- **Usage:** Major section titles (e.g., "Featured", "Instagram")
- **Tailwind:** `text-3xl font-bold`

#### **H3 - Tertiary Headings**
- **Font:** Poppins SemiBold (600)
- **Size:** 20-24px (1.25rem-1.5rem)
- **Line Height:** 1.4
- **Color:** `text-gray-900`
- **Usage:** Subsection titles, card titles
- **Tailwind:** `text-xl font-semibold`

#### **H4 - Small Headings**
- **Font:** Poppins SemiBold (600)
- **Size:** 16-18px (1rem-1.125rem)
- **Line Height:** 1.5
- **Color:** `text-gray-900`
- **Usage:** Small section headers, labels
- **Tailwind:** `text-lg font-semibold`

#### **Body Text - Large**
- **Font:** Poppins Regular (400)
- **Size:** 16-18px (1rem-1.125rem)
- **Line Height:** 1.6-1.7
- **Color:** `text-gray-600` or `text-gray-700`
- **Usage:** Main body content, descriptions
- **Tailwind:** `text-base`

#### **Body Text - Regular**
- **Font:** Poppins Regular (400)
- **Size:** 14-16px (0.875rem-1rem)
- **Line Height:** 1.6
- **Color:** `text-gray-600`
- **Usage:** Standard text, lists, paragraphs
- **Tailwind:** `text-sm`

#### **Body Text - Small**
- **Font:** Poppins Regular (400) or Thin (300)
- **Size:** 12-14px (0.75rem-0.875rem)
- **Line Height:** 1.5
- **Color:** `text-gray-500` or `text-gray-600`
- **Usage:** Captions, secondary information
- **Tailwind:** `text-xs`

#### **Labels & Form Text**
- **Font:** Poppins Medium (500) or SemiBold (600)
- **Size:** 12-14px (0.75rem-0.875rem)
- **Line Height:** 1.4
- **Color:** `text-gray-900`
- **Usage:** Form labels, input labels, badges
- **Tailwind:** `text-sm font-medium` or `text-sm font-semibold`

#### **Button Text**
- **Font:** Poppins Medium (500) or SemiBold (600)
- **Size:** 14-16px (0.875rem-1rem)
- **Line Height:** 1
- **Color:** Depends on button type (see button colors above)
- **Usage:** All button text
- **Tailwind:** `font-medium` or `font-semibold`

#### **Links**
- **Font:** Poppins Regular (400) or Medium (500)
- **Size:** Inherit from parent
- **Color:** `text-gray-900` default, `text-primary` on hover
- **Decoration:** Underline on hover
- **Usage:** Navigation links, in-text links
- **Tailwind:** `hover:underline`

---

### Font Pairing with Colors

#### **On White/Light Backgrounds:**
- **Headings:** `text-gray-900` or `text-black` (Poppins Bold)
- **Body:** `text-gray-600` or `text-gray-700` (Poppins Regular)
- **Secondary Text:** `text-gray-500` (Poppins Regular/Thin)
- **Accents:** `text-primary` (`#ccdb53`) for highlights

#### **On Dark Backgrounds (`bg-dark`):**
- **Headings:** `text-white` (Poppins Bold)
- **Body:** `text-gray-300` (Poppins Regular)
- **Secondary Text:** `text-gray-400` (Poppins Regular)
- **Accents:** `text-primary` (`#ccdb53`) for highlights

#### **On Primary Background (`bg-primary`):**
- **Headings:** `text-gray-900` or `text-black` (Poppins Bold)
- **Body:** `text-gray-700` or `text-gray-800` (Poppins Regular)
- **Secondary Text:** `text-gray-600` (Poppins Regular)
- **Buttons:** `bg-dark` with `text-white`

---

### Special Text Styling

#### **Italic/Emphasized Text**
- **Font:** Poppins Italic (any weight)
- **Usage:** Highlighted words in headings (e.g., "Collaborate")
- **Example:** `<span className="text-primary italic">Collaborate</span>`
- **Tailwind:** `italic`

#### **Uppercase Text**
- **Font:** Poppins Bold or SemiBold
- **Usage:** Section labels, small headers (e.g., "HOW BANTUBUZZ WORKS?")
- **Letter Spacing:** 0.05em-0.1em for better readability
- **Tailwind:** `uppercase tracking-wide`

#### **Numbers & Statistics**
- **Font:** Poppins Bold (700)
- **Size:** Larger than surrounding text (e.g., 18-24px)
- **Color:** `text-primary` for emphasis or `text-gray-900`
- **Usage:** Follower counts, stats, metrics
- **Example:** Follower count on creator cards

---

### Font Loading & Implementation

#### **Google Fonts Import**
Add to `index.html` or CSS:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap" rel="stylesheet">
```

#### **Tailwind Config**
```javascript
fontFamily: {
  sans: ['Poppins', 'sans-serif'],
},
```

#### **Font Weight Classes**
- `font-thin` - 100
- `font-extralight` - 200
- `font-light` - 300
- `font-normal` - 400
- `font-medium` - 500
- `font-semibold` - 600
- `font-bold` - 700
- `font-extrabold` - 800
- `font-black` - 900

---

### Typography Best Practices

1. **Consistency:** Use the same font weight for the same purpose throughout
2. **Hierarchy:** Create clear visual hierarchy with size and weight
3. **Readability:** Maintain proper line height (1.5-1.7 for body text)
4. **Contrast:** Ensure sufficient color contrast (see Accessibility section)
5. **Restraint:** Don't use more than 3 font weights per page
6. **Responsive:** Adjust font sizes for mobile devices
7. **Line Length:** Keep lines 50-75 characters for optimal readability

---

### Common Typography Patterns

#### **Hero Section**
```jsx
<h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
  Find Influencers to
  <br />
  <span className="text-primary italic">Collaborate</span> With
</h1>
```

#### **Section Header**
```jsx
<h2 className="text-3xl font-bold text-gray-900 mb-2">Featured</h2>
<p className="text-primary">Hire Top Influencers across all Platforms</p>
```

#### **Card Content**
```jsx
<h3 className="font-semibold text-gray-900">Creator Name</h3>
<span className="text-lg font-bold text-gray-900">150k</span>
<p className="text-xs text-gray-500">Followers</p>
```

#### **Button Text**
```jsx
<button className="bg-primary text-dark font-medium">
  Send message
</button>
```

---

### Typography on Mobile

#### **Responsive Font Sizes**
- **Hero:** `text-4xl sm:text-5xl md:text-6xl lg:text-7xl`
- **H1:** `text-3xl md:text-4xl`
- **H2:** `text-2xl md:text-3xl`
- **H3:** `text-xl md:text-2xl`
- **Body:** `text-sm md:text-base`
- **Small:** `text-xs md:text-sm`

#### **Mobile Adjustments**
- Reduce font sizes by 20-30% on mobile
- Increase line height slightly for better readability
- Adjust letter spacing for uppercase text
- Ensure touch targets are at least 44x44px for interactive text

---

## Color Usage Priority

### Frequency of Use (High to Low)
1. **White** - Most common for backgrounds and text
2. **Gray shades** - Neutral elements, text, borders
3. **Navy Dark (`#1F2937`)** - Dark sections, professional elements
4. **Primary (`#ccdb53`)** - Brand identity, primary actions
5. **Black** - Typography, icons
6. **Primary Light (`#ebf4e5`)** - Subtle backgrounds
7. **Primary Dark (`#838a36`)** - Secondary brand elements
8. **Lime (`#c8ff09`)** - Accent only, use very sparingly

---

## Logo Usage Guidelines

### Logo Anatomy (From Brand Guidelines)

#### **Primary Logo**
- **Type:** Lightning bolt "B" symbol
- **Usage:** Favicons, app icons, social media profile pictures, standalone brand marks
- **Minimum Size:** 32x32px for digital, 15mm for print
- **Clear Space:** Minimum space around logo equal to the height of the "B"

#### **Logo Type (Full Wordmark)**
- **Type:** "BantuBuzz" with lightning bolt "B"
- **Usage:** Website header, marketing materials, email signatures
- **Minimum Size:** 120px width for digital, 40mm for print
- **Clear Space:** Equal to half the height of the logo on all sides

### Logo Colors

#### **Primary Logo (Default)**
- **B Symbol:** Primary brand color `#ccdb53`
- **"antuBuzz" Text:** Primary brand color `#ccdb53`
- **Usage:** On white or light backgrounds

#### **Dark Logo (Inverted)**
- **B Symbol:** White `#FFFFFF`
- **"antuBuzz" Text:** White `#FFFFFF`
- **Usage:** On dark backgrounds (`bg-dark`, dark images)

#### **Monochrome Logo**
- **All Black:** Use on very light backgrounds when color is not available
- **All White:** Use on dark backgrounds or dark images

### Logo Don'ts

❌ **Never:**
1. Change logo colors to anything other than brand colors, white, or black
2. Rotate, skew, or distort the logo
3. Add effects (shadows, gradients, outlines) to the logo
4. Place logo on busy backgrounds with poor contrast
5. Use logo smaller than minimum size specifications
6. Crowd the logo with other elements (respect clear space)
7. Recreate or redraw the logo

✅ **Always:**
1. Maintain logo proportions
2. Ensure sufficient contrast with background
3. Use official logo files (SVG, PNG)
4. Respect clear space requirements

---

## Spacing & Layout Principles

### Spacing Scale (Based on Tailwind)

#### **Spacing Units**
- **4px (0.25rem):** `1` - Minimal spacing, tight layouts
- **8px (0.5rem):** `2` - Small gaps, icon spacing
- **12px (0.75rem):** `3` - Compact spacing
- **16px (1rem):** `4` - Default spacing unit
- **20px (1.25rem):** `5` - Medium spacing
- **24px (1.5rem):** `6` - Large spacing
- **32px (2rem):** `8` - Extra large spacing
- **48px (3rem):** `12` - Section spacing
- **64px (4rem):** `16` - Major section spacing
- **96px (6rem):** `24` - Hero section spacing

### Layout Guidelines

#### **Container Widths**
- **Max Width:** `max-w-7xl` (1280px) for main content
- **Padding:** `px-6 lg:px-12 xl:px-20` for consistent horizontal spacing
- **Centered:** `mx-auto` for center alignment

#### **Section Spacing**
- **Between Sections:** `py-12` to `py-16` (48-64px)
- **Within Sections:** `py-8` (32px)
- **Section Headers:** `mb-8` to `mb-12` (32-48px)

#### **Card Spacing**
- **Card Padding:** `p-4` to `p-6` (16-24px)
- **Card Gap:** `gap-4` to `gap-6` (16-24px)
- **Card Margin:** `m-4` (16px)

#### **Grid Layouts**
- **Columns:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Gap:** `gap-4` to `gap-6` (16-24px)
- **Responsive:** Adjust columns based on screen size

#### **Border Radius**
- **Small:** `rounded-lg` (8px) - Buttons, badges
- **Medium:** `rounded-xl` (12px) - Cards
- **Large:** `rounded-2xl` (16px) - Large cards, images
- **Extra Large:** `rounded-3xl` (24px) - Feature cards, CTAs
- **Full:** `rounded-full` - Circular buttons, pills, avatars

#### **Shadows**
- **Light:** `shadow-sm` - Subtle elevation
- **Medium:** `shadow-md` - Cards on hover
- **Large:** `shadow-lg` - Modals, dropdowns

---

## Design Principles

1. **Consistency:** Use the same color for the same purpose across the platform
2. **Hierarchy:** Use color to establish visual hierarchy (primary > secondary > tertiary)
3. **Contrast:** Ensure sufficient contrast for readability
4. **Restraint:** Don't use too many colors on one page - stick to 2-3 primary colors
5. **Purpose:** Every color should serve a purpose (brand, navigation, action, feedback)
6. **Spacing:** Use consistent spacing scale (multiples of 4px or 8px)
7. **Alignment:** Maintain clean alignment and visual rhythm
8. **White Space:** Embrace white space - don't overcrowd elements
9. **Responsive:** Design mobile-first, enhance for larger screens
10. **Accessibility:** Meet WCAG 2.1 Level AA standards for all users

---

## Version History

- **v1.0** (Dec 17, 2025) - Initial guideline combining Brand Guidelines with platform UI colors

---

## Contact

For questions about color usage, contact the BantuBuzz design team or refer to the official Brand Guidelines PDF.

**Powered by Bakoena Technologies**
