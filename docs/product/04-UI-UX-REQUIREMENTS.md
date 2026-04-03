# UI/UX Requirements
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Product + Design Team  

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Design System](#design-system)
3. [Component Library](#component-library)
4. [Page Layouts](#page-layouts)
5. [Responsive Design](#responsive-design)
6. [Accessibility](#accessibility)
7. [Animation & Interactions](#animation--interactions)
8. [Wireframes](#wireframes)

---

## Design Philosophy

### **Core Principles**

1. **Data-First:** Dashboard prioritizes metrics and insights over decorative elements
2. **AI-Native Aesthetic:** Modern, tech-forward design reflecting AI/ML positioning
3. **Speed:** Fast load times, instant feedback, optimistic UI updates
4. **Clarity:** Clear hierarchy, readable typography, obvious CTAs
5. **Trustworthy:** Professional appearance builds confidence in data accuracy

### **Visual Style**

**Inspiration:**
- **Linear:** Clean, minimal, fast
- **Vercel:** Dark mode, modern gradients
- **Stripe:** Data visualization, confidence-building

**Mood:**
- Professional but approachable
- Modern but not trendy
- Data-rich but not overwhelming

---

## Design System

### **1. Color Palette**

**Primary Colors:**

```css
/* Brand Colors */
--primary-600: #4F46E5; /* Indigo - primary CTAs */
--primary-700: #4338CA;
--primary-500: #6366F1;

/* Accent */
--accent-500: #10B981; /* Green - success, positive trends */
--accent-600: #059669;

/* Warning */
--warning-500: #F59E0B; /* Amber - warnings */
--warning-600: #D97706;

/* Danger */
--danger-500: #EF4444; /* Red - critical errors */
--danger-600: #DC2626;
```

**Neutral Colors:**

```css
/* Light Mode */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Dark Mode (future) */
--dark-bg: #0F1117;
--dark-surface: #1A1D29;
--dark-text: #E4E4E7;
```

**Semantic Colors:**

```css
/* AI Platform Colors */
--chatgpt: #10A37F;
--perplexity: #1FB6FF;
--gemini: #4285F4;
--claude: #CC785C;

/* Status Colors */
--success: #10B981;
--info: #3B82F6;
--warning: #F59E0B;
--error: #EF4444;
```

---

### **2. Typography**

**Font Stack:**

```css
/* Primary Font: Inter (body text) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace: JetBrains Mono (code, order numbers) */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

**Type Scale:**

```css
/* Headings */
--text-6xl: 3.75rem;  /* 60px - Hero headings */
--text-5xl: 3rem;     /* 48px - Page titles */
--text-4xl: 2.25rem;  /* 36px - Section titles */
--text-3xl: 1.875rem; /* 30px - Card titles */
--text-2xl: 1.5rem;   /* 24px - Subsections */
--text-xl: 1.25rem;   /* 20px - Card headings */
--text-lg: 1.125rem;  /* 18px - Large body */

/* Body */
--text-base: 1rem;    /* 16px - Default body */
--text-sm: 0.875rem;  /* 14px - Secondary text */
--text-xs: 0.75rem;   /* 12px - Captions, labels */
```

**Font Weights:**

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Usage:**

```typescript
<h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
<p className="text-base text-gray-600">Your AI visibility overview</p>
<span className="text-sm font-medium text-gray-500">Last updated 5 min ago</span>
```

---

### **3. Spacing**

**8pt Grid System:**

```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
```

**Usage:**
- **Padding (cards):** `p-6` (24px)
- **Gap (flex/grid):** `gap-4` (16px)
- **Margin (sections):** `mb-8` (32px)

---

### **4. Shadows**

```css
/* Card Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

**Usage:**
- **Cards:** `shadow-md`
- **Modals:** `shadow-xl`
- **Dropdowns:** `shadow-lg`

---

### **5. Border Radius**

```css
--radius-sm: 0.25rem;  /* 4px - badges, small buttons */
--radius: 0.5rem;      /* 8px - default (cards, buttons) */
--radius-md: 0.75rem;  /* 12px - larger cards */
--radius-lg: 1rem;     /* 16px - modals */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Component Library

### **1. Buttons**

**Variants:**

```typescript
// Primary Button (main CTA)
<Button className="bg-primary-600 hover:bg-primary-700 text-white">
  Upgrade Now
</Button>

// Secondary Button
<Button variant="outline" className="border-gray-300 text-gray-700">
  Cancel
</Button>

// Ghost Button (minimal)
<Button variant="ghost" className="text-gray-600 hover:bg-gray-100">
  View Details →
</Button>

// Danger Button
<Button variant="destructive" className="bg-danger-500 hover:bg-danger-600">
  Delete Store
</Button>
```

**Sizes:**

```typescript
<Button size="sm">Small</Button>       // 32px height
<Button size="default">Default</Button> // 40px height
<Button size="lg">Large</Button>       // 48px height
```

**States:**

```typescript
// Loading
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Processing...
</Button>

// Disabled
<Button disabled className="opacity-50 cursor-not-allowed">
  Disabled
</Button>
```

---

### **2. Cards**

**Base Card:**

```typescript
<Card className="rounded-lg shadow-md bg-white p-6">
  <CardHeader>
    <h3 className="text-xl font-semibold text-gray-900">Card Title</h3>
    <p className="text-sm text-gray-500">Card description</p>
  </CardHeader>
  <CardContent>
    {/* Card body */}
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Metric Card (Dashboard):**

```typescript
<Card className="metric-card">
  <CardHeader>
    <h4 className="text-sm font-medium text-gray-500">Total Mentions</h4>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold text-gray-900">47</div>
    <div className="mt-2 flex items-center text-sm">
      <ArrowUpIcon className="h-4 w-4 text-green-600" />
      <span className="text-green-600 font-medium">+12 (34.3%)</span>
      <span className="text-gray-500 ml-2">vs. last week</span>
    </div>
  </CardContent>
</Card>
```

---

### **3. Tables**

**Base Table:**

```typescript
<Table className="min-w-full">
  <TableHeader>
    <TableRow className="border-b border-gray-200">
      <TableHead className="text-sm font-semibold text-gray-700">Product</TableHead>
      <TableHead>Mentions</TableHead>
      <TableHead>Avg Position</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-b border-gray-100 hover:bg-gray-50">
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <img src="/product.jpg" className="w-12 h-12 rounded object-cover" />
          <span className="font-medium text-gray-900">Product Name</span>
        </div>
      </TableCell>
      <TableCell className="text-gray-600">18</TableCell>
      <TableCell>
        <Badge variant="success">#2</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### **4. Badges**

```typescript
// Default Badge
<Badge className="bg-gray-100 text-gray-700">Free</Badge>

// Success Badge
<Badge variant="success" className="bg-green-100 text-green-800">Active</Badge>

// Warning Badge
<Badge variant="warning" className="bg-yellow-100 text-yellow-800">Warning</Badge>

// Danger Badge
<Badge variant="destructive" className="bg-red-100 text-red-800">Critical</Badge>

// Outline Badge
<Badge variant="outline" className="border-gray-300 text-gray-700">In Stock</Badge>

// Platform Badge (custom)
<Badge className="bg-[#10A37F] text-white">ChatGPT</Badge>
```

---

### **5. Inputs**

**Text Input:**

```typescript
<div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
    Email
  </Label>
  <Input 
    id="email"
    type="email" 
    placeholder="you@example.com"
    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
  />
  <p className="text-xs text-gray-500">We'll never share your email.</p>
</div>
```

**Select Dropdown:**

```typescript
<Select value={selectedPlan} onValueChange={setSelectedPlan}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select plan..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="free">Free</SelectItem>
    <SelectItem value="starter">Starter</SelectItem>
    <SelectItem value="growth">Growth</SelectItem>
  </SelectContent>
</Select>
```

**Checkbox:**

```typescript
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms" className="text-sm text-gray-700">
    I agree to the Terms of Service
  </Label>
</div>
```

---

### **6. Alerts**

```typescript
// Success Alert
<Alert variant="success" className="bg-green-50 border-green-200">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-800">Success</AlertTitle>
  <AlertDescription className="text-green-700">
    Your store has been connected successfully.
  </AlertDescription>
</Alert>

// Error Alert
<Alert variant="destructive" className="bg-red-50 border-red-200">
  <AlertCircle className="h-4 w-4 text-red-600" />
  <AlertTitle className="text-red-800">Error</AlertTitle>
  <AlertDescription className="text-red-700">
    Failed to sync products. Please check your API credentials.
  </AlertDescription>
</Alert>

// Warning Alert
<Alert variant="warning" className="bg-yellow-50 border-yellow-200">
  <AlertTriangle className="h-4 w-4 text-yellow-600" />
  <AlertTitle className="text-yellow-800">Warning</AlertTitle>
  <AlertDescription className="text-yellow-700">
    You're approaching your plan limit (45/50 products).
  </AlertDescription>
</Alert>
```

---

## Page Layouts

### **1. Dashboard Layout**

**Structure:**

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (240px)     │  Main Content (flex-1)         │
│                     │                                 │
│ Logo                │  Header (80px)                  │
│                     │  ┌─────────────────────────┐    │
│ Navigation:         │  │ Page Title              │    │
│ - Dashboard         │  │ "Dashboard"             │    │
│ - Products          │  │                         │    │
│ - Visibility        │  │ Actions: [Scan Now]     │    │
│ - Truth Engine      │  └─────────────────────────┘    │
│ - Settings          │                                 │
│                     │  Content Area                   │
│ ─────────────       │  ┌─────────┬─────────┐          │
│ User Menu:          │  │ Card    │ Card    │          │
│ - John Doe          │  │ Mentions│Visibility│         │
│ - Starter Plan      │  └─────────┴─────────┘          │
│ - Upgrade           │                                 │
│ - Logout            │  ┌─────────────────────┐        │
│                     │  │ Chart               │        │
│                     │  └─────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

**Sidebar Navigation:**

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Products', href: '/products', icon: PackageIcon },
  { name: 'Visibility', href: '/visibility', icon: EyeIcon },
  { name: 'Truth Engine', href: '/truth-engine', icon: ShieldCheckIcon },
  { name: 'ACP Orders', href: '/acp', icon: ShoppingCartIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon }
];

<nav className="space-y-1">
  {navigation.map(item => (
    <Link 
      key={item.name}
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
        pathname === item.href 
          ? 'bg-primary-50 text-primary-700' 
          : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  ))}
</nav>
```

---

### **2. Dashboard Page (Home)**

**Hero Metrics Row:**

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <MetricCard 
    title="Total Mentions"
    value={47}
    change={+12}
    changePercent={34.3}
  />
  <MetricCard 
    title="Visibility Rate"
    value="46%"
    change={+5}
    changePercent={12.2}
  />
  <MetricCard 
    title="Products Visible"
    value="23/50"
    change={+3}
  />
  <MetricCard 
    title="Top Platform"
    value="ChatGPT"
    badge="29 mentions"
  />
</div>
```

**Chart Section:**

```typescript
<Card className="mb-8">
  <CardHeader>
    <h3 className="text-lg font-semibold">AI Mentions Over Time</h3>
  </CardHeader>
  <CardContent>
    <LineChart width={800} height={300} data={timelineData}>
      {/* Chart implementation */}
    </LineChart>
  </CardContent>
</Card>
```

**Top Products Table:**

```typescript
<Card>
  <CardHeader>
    <h3 className="text-lg font-semibold">Top Products</h3>
  </CardHeader>
  <CardContent>
    <Table>
      {/* Table rows */}
    </Table>
  </CardContent>
</Card>
```

---

### **3. Product Detail Page**

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Back Button ← Back to Products                  │
├─────────────────────────────────────────────────┤
│ Product Header                                  │
│ ┌──────┐  Organic Fair Trade Coffee Blend      │
│ │ IMG  │  $24.99 • In Stock (150 units)         │
│ └──────┘  AI Readability: 87/100                │
├─────────────────────────────────────────────────┤
│ Tabs: [Visibility] [Truth Engine] [Details]    │
├─────────────────────────────────────────────────┤
│ Visibility Tab:                                 │
│ ┌──────────┬──────────┬──────────┬──────────┐  │
│ │ ChatGPT  │Perplexity│  Gemini  │  Claude  │  │
│ │ 32 mentions│12 mentions│3 mentions│0 mentions│  │
│ │ Avg #1.8 │ Avg #2.5 │ Avg #4.0 │    -     │  │
│ └──────────┴──────────┴──────────┴──────────┘  │
│                                                 │
│ Query Intelligence:                             │
│ • "Best organic coffee brands" → #2            │
│ • "Fair trade coffee subscription" → #1         │
│ • "Sustainable coffee beans" → #3              │
└─────────────────────────────────────────────────┘
```

---

## Responsive Design

### **Breakpoints**

```css
/* Tailwind CSS breakpoints */
--screen-sm: 640px;   /* Mobile landscape */
--screen-md: 768px;   /* Tablet */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large desktop */
--screen-2xl: 1536px; /* Extra large */
```

### **Mobile Optimization (< 768px)**

**Sidebar → Bottom Navigation:**

```typescript
{/* Mobile: Bottom nav bar */}
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
  <div className="flex justify-around">
    <Link href="/dashboard" className="flex flex-col items-center">
      <HomeIcon className="h-6 w-6" />
      <span className="text-xs">Home</span>
    </Link>
    <Link href="/products" className="flex flex-col items-center">
      <PackageIcon className="h-6 w-6" />
      <span className="text-xs">Products</span>
    </Link>
    {/* More nav items */}
  </div>
</nav>
```

**Hero Metrics → Stack Vertically:**

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Metric cards stack on mobile, 2-col on tablet, 4-col on desktop */}
</div>
```

**Tables → Horizontal Scroll:**

```typescript
<div className="overflow-x-auto">
  <Table className="min-w-[600px]">
    {/* Table scrolls horizontally on mobile */}
  </Table>
</div>
```

---

## Accessibility

### **WCAG 2.1 AA Compliance**

**Color Contrast:**
- Body text (gray-700 on white): 11.6:1 ✅
- Buttons (white on primary-600): 4.8:1 ✅
- Minimum required: 4.5:1 for normal text, 3:1 for large text

**Keyboard Navigation:**
- All interactive elements focusable via Tab
- Focus indicators visible (2px blue ring)
- Modal traps focus (can't Tab out)

**Screen Readers:**

```typescript
// Accessible button
<Button aria-label="Trigger AI visibility scan">
  <RefreshCw className="mr-2" aria-hidden="true" />
  Scan Now
</Button>

// Accessible image
<img 
  src={product.image_url} 
  alt={`Product image of ${product.name}`}
/>

// Skip to content link
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

**Form Labels:**

```typescript
<Label htmlFor="email" className="sr-only">Email address</Label>
<Input id="email" type="email" placeholder="Email address" />
```

---

## Animation & Interactions

### **Hover States**

```css
/* Button */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 150ms ease;
}

/* Card */
.card:hover {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  transition: box-shadow 200ms ease;
}
```

### **Loading States**

```typescript
// Skeleton loader
<div className="animate-pulse">
  <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
</div>

// Spinner
<Loader2 className="h-8 w-8 animate-spin text-primary-600" />
```

### **Toast Notifications**

```typescript
import { toast } from 'sonner';

// Success toast
toast.success('Product synced successfully!', {
  description: '47 products updated from Shopify',
  duration: 5000
});

// Error toast
toast.error('Sync failed', {
  description: 'Invalid Shopify credentials. Please reconnect your store.',
  action: {
    label: 'Reconnect',
    onClick: () => router.push('/settings/stores')
  }
});
```

### **Micro-interactions**

```typescript
// Button click feedback
<Button 
  onClick={handleClick}
  className="active:scale-95 transition-transform"
>
  Click Me
</Button>

// Checkbox animation
<Checkbox className="data-[state=checked]:bg-primary-600 transition-colors" />

// Confetti (first ACP order)
import Confetti from 'react-confetti';

<Confetti 
  width={window.innerWidth}
  height={window.innerHeight}
  recycle={false}
  numberOfPieces={200}
/>
```

---

## Wireframes

### **1. Login Page**

```
┌─────────────────────────────────────────┐
│                                         │
│           [Logo]                        │
│                                         │
│     Sign in to AgenticRev               │
│     Track your AI commerce visibility   │
│                                         │
│     ┌─────────────────────────────┐    │
│     │ Email                       │    │
│     └─────────────────────────────┘    │
│                                         │
│     ┌─────────────────────────────┐    │
│     │ Password                    │    │
│     └─────────────────────────────┘    │
│                                         │
│     [ Sign In ]                         │
│                                         │
│     ───────── OR ─────────              │
│                                         │
│     [ Sign in with Shopify ]            │
│                                         │
│     Don't have an account? Sign up →   │
│                                         │
└─────────────────────────────────────────┘
```

---

### **2. Dashboard Page**

```
┌─────────────────────────────────────────────────────────┐
│ AgenticRev                                  [Scan Now] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Dashboard                                              │
│  Your AI visibility overview                            │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  47     │ │  46%    │ │  23/50  │ │ ChatGPT │      │
│  │ Mentions│ │Visibility│ │Products │ │29 mentions│    │
│  │ +12 ↑   │ │ +5% ↑   │ │ +3      │ │Top Platform│   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│  AI Mentions Over Time                                  │
│  ┌───────────────────────────────────────────────┐     │
│  │                                               │     │
│  │   [Line Chart]                                │     │
│  │                                               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  Top Products                                           │
│  ┌───────────────────────────────────────────────┐     │
│  │ Product Name       Mentions  Avg Position     │     │
│  │ ────────────────────────────────────────────  │     │
│  │ Organic Coffee        18         #2           │     │
│  │ Bamboo Toothbrush     12         #1           │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### **3. Product Detail Page**

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Products                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────┐  Organic Fair Trade Coffee Blend               │
│  │IMG │  $24.99 • In Stock (150 units)                 │
│  └────┘  AI Readability: 87/100                         │
│                                                         │
│  [Visibility] [Truth Engine] [Details]                 │
│  ──────────────────────────────────────────────────     │
│                                                         │
│  Platform Breakdown                                     │
│  ┌────────┬────────┬────────┬────────┐                 │
│  │ChatGPT │Perplex.│ Gemini │ Claude │                 │
│  │ 32     │  12    │   3    │   0    │                 │
│  │Avg #1.8│Avg #2.5│Avg #4.0│   -    │                 │
│  └────────┴────────┴────────┴────────┘                 │
│                                                         │
│  Query Intelligence                                     │
│  • "Best organic coffee brands" → Position #2          │
│  • "Fair trade coffee subscription" → Position #1      │
│  • "Sustainable coffee beans" → Position #3            │
│                                                         │
│  Missed Opportunities                                   │
│  ⚠️ Not ranking for "organic coffee subscription"      │
│     Competitors: BrandX, BrandY                         │
│     Suggestion: Add "subscription" keyword             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Hand off to design team for high-fidelity mockups (Figma)  
**Dependencies:** shadcn/ui component library, Tailwind CSS  

---

**Design Assets Needed:**
- [ ] Logo (SVG, light + dark versions)
- [ ] Favicon (multiple sizes)
- [ ] Empty state illustrations (products, scans, errors)
- [ ] Loading animations (skeleton screens)
- [ ] Error state illustrations (404, 500, network errors)

**Figma Prototypes:**
- [ ] Dashboard page (desktop + mobile)
- [ ] Product detail page
- [ ] Truth Engine error list
- [ ] Onboarding wizard (3 steps)
- [ ] Upgrade modal (plan comparison)

---

*This document provides 90% of UI/UX specifications. Final pixel-perfect designs will be created in Figma before development begins.*
