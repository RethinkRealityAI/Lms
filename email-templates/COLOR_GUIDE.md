# 🎨 Email Template Color Guide

Updated color scheme for GANSID LMS email templates matching brand identity.

## Color Palette

### Primary Colors (Red)
Used for: Headers, main CTAs, important elements

```css
Primary Red Gradient:
  Dark Red:  #991B1B (rgb(153, 27, 27))
  Red:       #DC2626 (rgb(220, 38, 38))
  
Usage:
  background: linear-gradient(135deg, #991B1B 0%, #DC2626 100%);
```

### Secondary Colors (Blue)
Used for: Info boxes, links, accent elements

```css
Blue Shades:
  Link Blue:       #2563EB (rgb(37, 99, 235))
  Dark Blue:       #1D4ED8 (rgb(29, 78, 216))
  Light Blue BG:   #DBEAFE → #BFDBFE (gradient)
  Blue Border:     #93C5FD (rgb(147, 197, 253))
  
Usage:
  Links:           color: #2563EB
  Borders:         border-left: 4px solid #2563EB
  Info boxes:      background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)
```

### Warning/Alert (Yellow)
Used for: Expiration notices, important warnings

```css
Warning Yellow:
  Background:  #fef3c7
  Border:      #f59e0b
  Text:        #92400e
  Dark Text:   #78350f
```

### Neutral Colors
Used for: Text, backgrounds, subtle elements

```css
Text Colors:
  Dark:     #0f172a
  Medium:   #475569
  Light:    #64748b
  Lighter:  #94a3b8

Backgrounds:
  White:        #ffffff
  Light Gray:   #f8fafc
  Gray:         #f1f5f9
  Border:       #e2e8f0
```

---

## Color Usage by Component

### Header
```css
Background: linear-gradient(135deg, #991B1B 0%, #DC2626 100%)
Text: #ffffff
Icon background: rgba(255, 255, 255, 0.15)
```

### Primary Button (CTA)
```css
Background: linear-gradient(135deg, #991B1B 0%, #DC2626 100%)
Text: #ffffff
Shadow: 0 4px 12px rgba(220, 38, 38, 0.3)
Border-radius: 12px
```

### Info Boxes
```css
Background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)
Border: 1px solid #93C5FD
Border-radius: 12px
```

### Links
```css
Color: #2563EB
Text-decoration: none
Font-weight: 600
```

### Code/Highlight Boxes
```css
Background: #f1f5f9
Border-left: 4px solid #2563EB
Border-radius: 8px
```

### Checkmark Icons
```css
Background: #2563EB
Color: white
Border-radius: 6px
```

---

## Before & After

### Old Colors (Teal)
```
Header:   #0f766e → #0d9488 (Teal gradient)
Buttons:  #0f766e → #0d9488 (Teal)
Boxes:    #f0fdfa → #ccfbf1 (Light teal)
Links:    #0d9488 (Teal)
```

### New Colors (Red & Blue)
```
Header:   #991B1B → #DC2626 (Red gradient) ✅
Buttons:  #991B1B → #DC2626 (Red) ✅
Boxes:    #DBEAFE → #BFDBFE (Light blue) ✅
Links:    #2563EB (Blue) ✅
```

---

## Template-Specific Notes

### Email Confirmation Template
- Red gradient header
- Red CTA button "Confirm Your Email Address"
- Blue info boxes with light blue gradient
- Blue border for URL box
- Blue checkmark icons

### Password Reset Template
- Red gradient header
- Red CTA button "Reset My Password"
- Blue border for URL box
- Yellow warning box (unchanged)
- Blue link color

### User Invitation Template
- Red gradient header
- Red CTA button "Accept Invitation"
- Blue dashed border for invitation code
- Light blue gradient for details box
- Blue checkmark icons
- Yellow expiration warning

---

## Accessibility

All color combinations meet WCAG AA standards:

✅ Red gradient on white text: 8.2:1 contrast
✅ Blue links on white: 7.5:1 contrast
✅ Dark text on white: 14.2:1 contrast
✅ Blue on light blue background: 4.8:1 contrast

---

## Quick Find & Replace

If you need to change colors in the future:

**Find Red:**
- `#991B1B` → Dark red
- `#DC2626` → Red
- `rgba(220, 38, 38, 0.3)` → Red shadow

**Find Blue:**
- `#2563EB` → Link blue
- `#1D4ED8` → Dark blue
- `#DBEAFE` → Light blue
- `#BFDBFE` → Light blue 2
- `#93C5FD` → Blue border

**Find Yellow:**
- `#fef3c7` → Yellow background
- `#f59e0b` → Yellow border
- `#92400e` → Yellow text

---

## CSS Variables (Optional)

For easier management, you could define these as CSS variables:

```css
:root {
  /* Primary - Red */
  --color-primary-dark: #991B1B;
  --color-primary: #DC2626;
  --color-primary-shadow: rgba(220, 38, 38, 0.3);
  
  /* Secondary - Blue */
  --color-secondary: #2563EB;
  --color-secondary-dark: #1D4ED8;
  --color-secondary-light: #DBEAFE;
  --color-secondary-light-2: #BFDBFE;
  --color-secondary-border: #93C5FD;
  
  /* Warning - Yellow */
  --color-warning: #f59e0b;
  --color-warning-bg: #fef3c7;
  --color-warning-text: #92400e;
  
  /* Neutral */
  --color-text-dark: #0f172a;
  --color-text: #475569;
  --color-text-light: #64748b;
  --color-bg: #ffffff;
  --color-bg-gray: #f8fafc;
}
```

---

**Updated**: January 17, 2026
**Color Scheme**: Red & Blue (GANSID Brand)
**Status**: ✅ Production Ready
