---
name: ios-react-design
description: Use this skill when building or restyling React mobile UIs to look like premium native iOS apps. Triggers on: 'make it look better', 'redesign', 'iOS style', 'professional UI', 'premium design', or any request to improve visual quality of a React app.
---

# iOS-Style Premium React UI Skill

You are a senior product designer and React engineer. Your job is to make React apps look and feel like premium native iOS applications — the kind that cost €50/month and feel worth every cent.

## Core Philosophy

**Never generate generic "AI slop" UI.** Every screen must feel intentional, refined, and native. If it looks like a Tailwind tutorial, start over.

The standard: open the app and it feels like it belongs on the App Store next to Notion, Linear, or Revolut.

---

## Design System

### Colors
```js
const P   = '#7C3AED';  // Primary purple
const PL  = '#8B5CF6';  // Light purple
const PD  = '#6D28D9';  // Dark purple
const G   = `linear-gradient(135deg, ${PD}, ${P}, ${PL})`; // Gradient

// Backgrounds
const BG      = '#f2f2f7';  // iOS system background
const BG2     = '#ffffff';  // Card background
const BG3     = '#f2f2f7';  // Grouped section background

// Text
const T1  = '#000000';      // Primary text
const T2  = '#3c3c43';      // Secondary text (99% opacity)
const T3  = '#8e8e93';      // Tertiary / placeholder
const T4  = '#c7c7cc';      // Quaternary / disabled

// System colors
const RED     = '#FF3B30';
const GREEN   = '#34C759';
const BLUE    = '#007AFF';
const ORANGE  = '#FF9500';
const YELLOW  = '#FFCC00';
```

### Typography (iOS SF Pro scale)
```
Large Title:  34px, weight 700, tracking -0.5px  → main screen headers
Title 1:      28px, weight 700
Title 2:      22px, weight 700
Title 3:      20px, weight 600
Headline:     17px, weight 600
Body:         17px, weight 400
Callout:      16px, weight 400
Subhead:      15px, weight 400
Footnote:     13px, weight 400
Caption:      12px, weight 400, color T3
```

### Spacing
```
Screen padding:     20px horizontal
Section gap:        20px
Card inner:         16px
List item:          12px 16px
Small gap:          8px
Tiny gap:           4px
```

### Border Radius
```
Cards:              12px
Buttons large:      14px
Buttons small:      10px
Inputs:             12px
Badges/pills:       100px (full)
Icons:              10-12px
```

### Shadows
```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04);

/* Elevated card */
box-shadow: 0 4px 16px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04);

/* Button */
box-shadow: 0 2px 8px rgba(124,58,237,0.35);
```

---

## Component Patterns

### Screen Layout
```jsx
// Every screen follows this structure:
<div style={{minHeight:'100%', background:'#f2f2f7'}}>
  <Hdr large title="Baustellen" right={<AddButton/>}/>
  <div style={{padding:'0 20px 100px'}}>
    {/* content */}
  </div>
</div>
```

### Headers — Two types only
```jsx
// LARGE (main screens: dashboard, lists)
<div style={{padding:'16px 20px 12px', paddingTop:'calc(var(--safe-top) + 16px)', background:'#f2f2f7'}}>
  {onBack && <button style={{color:P, fontSize:15, display:'flex', alignItems:'center', gap:2, marginBottom:8, marginLeft:-4}}>
    <ChevronLeft size={20}/> Zurück
  </button>}
  <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between'}}>
    <h1 style={{fontSize:34, fontWeight:700, color:'#000', letterSpacing:'-0.5px', lineHeight:1.1}}>{title}</h1>
    {right}
  </div>
</div>

// COMPACT (detail/form screens)
<div style={{padding:'12px 20px', paddingTop:'calc(var(--safe-top) + 12px)', background:'rgba(242,242,247,0.85)', backdropFilter:'blur(20px)', borderBottom:'0.5px solid rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:10}}>
  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
    <button style={{color:P, fontSize:17, display:'flex', alignItems:'center', gap:2, minWidth:70}}>
      <ChevronLeft size={22}/> Zurück
    </button>
    <span style={{fontSize:17, fontWeight:600, color:'#000'}}>{title}</span>
    <div style={{minWidth:70, display:'flex', justifyContent:'flex-end'}}>{right}</div>
  </div>
</div>
```

### Cards
```jsx
// Standard card
<div style={{background:'white', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)'}}>
  {/* content */}
</div>

// Grouped list (iOS Settings style)
<div style={{background:'white', borderRadius:12, overflow:'hidden', boxShadow:'0 0 0 0.5px rgba(0,0,0,0.04)'}}>
  {items.map((item, i) => (
    <div key={i} style={{padding:'12px 16px', borderTop: i>0 ? '0.5px solid rgba(0,0,0,0.08)' : 'none'}}>
      {/* item */}
    </div>
  ))}
</div>
```

### Buttons
```jsx
// Primary (gradient)
<button style={{
  background: G,
  color: 'white',
  borderRadius: 14,
  padding: '16px 24px',
  fontSize: 17,
  fontWeight: 600,
  width: '100%',
  boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
  border: 'none',
}}>
  Speichern
</button>

// Secondary
<button style={{
  background: `${P}12`,
  color: P,
  borderRadius: 12,
  padding: '10px 18px',
  fontSize: 15,
  fontWeight: 600,
  border: 'none',
}}>
  Bearbeiten
</button>

// Destructive
<button style={{background:'#FF3B3012', color:'#FF3B30', borderRadius:12, padding:'10px 18px', fontSize:15, fontWeight:600, border:'none'}}>
  Löschen
</button>

// Icon button
<button style={{width:36, height:36, borderRadius:10, background:`${P}12`, display:'flex', alignItems:'center', justifyContent:'center', border:'none'}}>
  <Plus size={18} style={{color:P}}/>
</button>
```

### Inputs
```jsx
// Text input
<div>
  <label style={{fontSize:13, fontWeight:500, color:'#8e8e93', textTransform:'uppercase', letterSpacing:0.4, padding:'0 4px', marginBottom:4, display:'block'}}>
    Kundenname
  </label>
  <input style={{
    width:'100%', padding:'12px 16px',
    background:'white', borderRadius:12,
    border:'0.5px solid rgba(0,0,0,0.1)',
    fontSize:17, color:'#000',
    outline:'none',
    boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
  }}/>
</div>
```

### Badges / Status Pills
```jsx
// Status badge
<span style={{
  background: `${color}15`,
  color: color,
  padding: '4px 10px',
  borderRadius: 100,
  fontSize: 12,
  fontWeight: 600,
}}>
  {text}
</span>

// Status colors:
// aktiv    → #34C759
// geplant  → #007AFF  
// fertig   → #8e8e93
// offen    → #FF3B30
// erledigt → #34C759
// hoch     → #FF3B30
// mittel   → #FF9500
// niedrig  → #34C759
```

### List Items (Navigation style)
```jsx
<button style={{width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', textAlign:'left', background:'none', border:'none'}}>
  {/* Icon */}
  <div style={{width:36, height:36, borderRadius:10, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
    <Icon size={18} style={{color}}/>
  </div>
  {/* Content */}
  <div style={{flex:1, minWidth:0}}>
    <p style={{fontSize:16, color:'#000', fontWeight:400}}>{label}</p>
    <p style={{fontSize:13, color:'#8e8e93'}}>{sublabel}</p>
  </div>
  {/* Chevron */}
  <ChevronRight size={18} style={{color:'#c7c7cc'}}/>
</button>
```

### Stats / KPI Cards
```jsx
<div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:20}}>
  {[
    {value: '12', label: 'Aktiv', color: GREEN},
    {value: '3', label: 'Mängel', color: RED},
    {value: '8', label: 'Handwerker', color: P},
  ].map(s => (
    <div key={s.label} style={{background:'white', borderRadius:12, padding:'14px 12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', textAlign:'center'}}>
      <p style={{fontSize:28, fontWeight:700, color:s.color, lineHeight:1}}>{s.value}</p>
      <p style={{fontSize:12, color:'#8e8e93', marginTop:4}}>{s.label}</p>
    </div>
  ))}
</div>
```

### Section Headers
```jsx
// iOS grouped section label
<p style={{fontSize:13, fontWeight:600, color:'#8e8e93', textTransform:'uppercase', letterSpacing:0.5, padding:'16px 4px 6px'}}>
  Übersicht
</p>
```

### Empty States
```jsx
<div style={{textAlign:'center', padding:'60px 20px'}}>
  <div style={{width:64, height:64, borderRadius:20, background:`${P}12`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px'}}>
    <Icon size={28} style={{color:P}}/>
  </div>
  <p style={{fontSize:17, fontWeight:600, color:'#000', marginBottom:8}}>Keine Einträge</p>
  <p style={{fontSize:15, color:'#8e8e93'}}>Tippe auf + um den ersten Eintrag hinzuzufügen.</p>
</div>
```

### Bottom Tab Bar
```jsx
<div style={{
  position:'fixed', bottom:0, left:0, right:0,
  background:'rgba(249,249,249,0.94)',
  backdropFilter:'blur(20px)',
  borderTop:'0.5px solid rgba(0,0,0,0.1)',
  paddingBottom:'env(safe-area-inset-bottom)',
  display:'flex',
}}>
  {tabs.map(tab => (
    <button key={tab.id} onClick={()=>nav(tab.id)} style={{
      flex:1, display:'flex', flexDirection:'column',
      alignItems:'center', gap:2, padding:'8px 0',
      border:'none', background:'none',
      color: activeTab===tab.id ? P : '#8e8e93',
    }}>
      <tab.icon size={24} strokeWidth={activeTab===tab.id ? 2.2 : 1.6}/>
      <span style={{fontSize:10, fontWeight: activeTab===tab.id ? 600 : 400}}>{tab.label}</span>
    </button>
  ))}
</div>
```

### Progress Bar
```jsx
<div style={{background:`${P}15`, borderRadius:100, overflow:'hidden', height:6}}>
  <div style={{height:'100%', borderRadius:100, background:G, width:`${value}%`, transition:'width 0.3s ease'}}/>
</div>
```

### Toast Notification
```jsx
// Success: background #34C759, Error: #FF3B30
// Always: rounded-2xl, blur backdrop, centered top, z-50
```

---

## Rules — NEVER break these

1. **No dark backgrounds** — always light (#f2f2f7 / white)
2. **No heavy borders** — max 0.5px rgba(0,0,0,0.1)
3. **No Tailwind for layout-critical styles** — use inline styles for precision
4. **No generic gray buttons** — every button has purpose and color
5. **No cramped spacing** — minimum 12px padding inside cards
6. **No ALL CAPS labels except section headers**
7. **No placeholder icons** — every icon must be meaningful
8. **German everywhere** — no English text visible to users
9. **Touch targets minimum 44px** — iOS HIG requirement
10. **Consistent border-radius** — cards=12px, buttons=14px, inputs=12px, never mix

---

## When Restyling Existing Code

1. Keep ALL functionality and logic intact — only change styles
2. Replace `className` Tailwind strings with inline `style` objects for precision
3. Keep Tailwind only for utility classes (flex, grid, overflow, etc.)
4. Replace every `bg-slate-*` with proper iOS colors
5. Replace every `rounded-xl` with `borderRadius:12` inline
6. Update all text colors from `text-slate-*` to iOS text hierarchy
7. Add subtle shadows to every card
8. Ensure 20px horizontal padding on all screens
9. Check empty states — every list needs one
10. Verify tab bar works on all screens

---

## Quality Checklist

Before finishing, verify:
- [ ] Opens and feels premium immediately
- [ ] Colors are consistent (only use the palette above)
- [ ] Typography follows the iOS scale
- [ ] Every card has proper shadow
- [ ] Spacing is generous (not cramped)
- [ ] Buttons are large enough to tap (min 44px height)
- [ ] Empty states exist for all lists
- [ ] German language throughout
- [ ] No visual inconsistencies between screens
