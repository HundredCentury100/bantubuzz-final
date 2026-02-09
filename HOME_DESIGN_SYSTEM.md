# Home.jsx Design System - Master Reference

## Core Design Principles from Home.jsx

### 1. **Card Styling**
- **Main cards**: `bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`
- **Card with colored bg (Instagram)**: `bg-primary rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`
- **Large CTA cards**: `bg-dark/bg-primary p-12 rounded-3xl`

### 2. **Border Radius Standards**
- **Cards**: `rounded-3xl` (24px)
- **Images inside cards**: `rounded-2xl` (16px)
- **Buttons**: `rounded-full`
- **Pills/Tags**: `rounded-full`
- **Category cards**: `rounded-2xl`

### 3. **Button Styles**
- **Primary button**: `bg-dark text-white py-3 rounded-full font-medium hover:bg-gray-800`
- **Secondary button**: `bg-primary text-dark py-3 rounded-full font-medium hover:bg-primary/90`
- **White button on colored bg**: `bg-white text-dark py-3 rounded-full font-medium hover:bg-gray-100`
- **Tab buttons**: `px-6 py-3 rounded-full font-medium` (active: `bg-primary text-dark`, inactive: `bg-gray-200 text-gray-600`)

### 4. **Card Structure (Creator Cards)**
```jsx
<div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
  {/* Image with m-4 spacing */}
  <div className="aspect-square m-4 rounded-2xl overflow-hidden bg-gray-100 relative">
    <ResponsiveImage ... />
    {/* Badge overlays */}
    <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
      <CreatorBadge variant="overlay" />
    </div>
  </div>

  {/* Content with px-4 pb-4 */}
  <div className="px-4 pb-4">
    {/* Name and Followers row */}
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          {/* Icon badges next to name */}
          <CreatorBadge variant="icon" />
        </div>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold">{followers}</span>
        <p className="text-xs text-gray-500">Followers</p>
      </div>
    </div>

    {/* Social icons and category pill */}
    <div className="flex justify-between items-center mb-4">
      <div className="flex gap-2">
        {/* Social SVG icons w-4 h-4 text-gray-600 */}
      </div>
      <span className="text-xs px-3 py-1 border border-gray-300 rounded-full">
        {category}
      </span>
    </div>

    {/* CTA Button */}
    <Link className="block w-full bg-dark text-white text-center py-3 rounded-full font-medium hover:bg-gray-800">
      View profile
    </Link>
  </div>
</div>
```

### 5. **Typography**
- **Hero heading**: `text-5xl md:text-6xl lg:text-7xl font-bold`
- **Section titles**: `text-3xl font-bold mb-1`
- **Section subtitles**: `text-gray-600`
- **Creator name**: `font-semibold text-gray-900`
- **Follower count**: `text-lg font-bold`
- **Pills/tags**: `text-xs`

### 6. **Colors**
- **Primary**: `bg-primary` (#F15A29 orange) / `text-primary`
- **Dark**: `bg-dark` (#1F2937 navy) / `text-dark`
- **Light background**: `bg-light` (#F3F4F6)
- **White cards**: `bg-white`
- **Text colors**: `text-gray-900` (headings), `text-gray-600` (body), `text-gray-500` (meta)

### 7. **Spacing & Layout**
- **Section padding**: `py-12 px-6 lg:px-12 xl:px-20`
- **Card grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`
- **Card inner spacing**: Image has `m-4`, content has `px-4 pb-4`
- **Element spacing**: `mb-3`, `mb-4` for consistent vertical rhythm

### 8. **Status Pills**
- **Style**: `text-xs px-3 py-1 border border-gray-300 rounded-full`
- **Categories**: Same style with optional colored borders
- **Always use rounded-full, not rounded-lg**

### 9. **Shadows**
- **Default**: `shadow-sm`
- **Hover**: `hover:shadow-md`
- **Large cards**: `shadow-lg` (search bar)

### 10. **Icons**
- **Social icons**: `w-4 h-4 text-gray-600` (inline SVG)
- **UI icons**: `w-6 h-6` (MagnifyingGlass, arrows)
- **Badge icons**: Handled by CreatorBadge component

## What NOT to Use
❌ `rounded-lg` for buttons/pills (use `rounded-full`)
❌ `rounded-xl` for cards (use `rounded-3xl`)
❌ Background colors other than primary/dark/light/white
❌ Different shadow intensities (stick to sm/md)
❌ Custom padding patterns (follow the spacing system)
❌ Engagement rate displays

## Pages That Need Alignment
1. ✅ Home.jsx - REFERENCE (already perfect)
2. ⚠️ BrowseCreators.jsx - Needs card redesign
3. ⚠️ CreatorProfile.jsx - Needs layout redesign
4. ⚠️ PackageDetails.jsx - Needs card/button redesign
5. ⚠️ Creators.jsx (legacy) - Needs full redesign
6. ⚠️ CreatorProfileEdit.jsx - Form needs styling alignment
7. ⚠️ Dashboard pages - All need review
8. ⚠️ Campaign pages - Need review
9. ⚠️ Booking pages - Need review

## Implementation Priority
1. Creator-facing public pages (Browse, Profile, Packages)
2. Forms and edit pages
3. Dashboard pages
4. Campaign/booking pages
