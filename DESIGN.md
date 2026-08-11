---
name: Serene Support
colors:
  surface: '#f7fafd'
  surface-dim: '#d7dade'
  surface-bright: '#f7fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f7'
  surface-container: '#ebeef2'
  surface-container-high: '#e5e8ec'
  surface-container-highest: '#e0e3e6'
  on-surface: '#181c1f'
  on-surface-variant: '#41474f'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eef1f4'
  outline: '#727780'
  outline-variant: '#c1c7d0'
  surface-tint: '#2b6290'
  primary: '#285f8e'
  on-primary: '#ffffff'
  primary-container: '#4478a8'
  on-primary-container: '#fdfcff'
  inverse-primary: '#99cbff'
  secondary: '#3e6658'
  on-secondary: '#ffffff'
  secondary-container: '#c0ecda'
  on-secondary-container: '#446c5e'
  tertiary: '#5f5b54'
  on-tertiary: '#ffffff'
  tertiary-container: '#78746c'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#99cbff'
  on-primary-fixed: '#001d34'
  on-primary-fixed-variant: '#044a77'
  secondary-fixed: '#c0ecda'
  secondary-fixed-dim: '#a5d0be'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#264e41'
  tertiary-fixed: '#e8e2d8'
  tertiary-fixed-dim: '#ccc6bc'
  on-tertiary-fixed: '#1e1b15'
  on-tertiary-fixed-variant: '#4a463f'
  background: '#f7fafd'
  on-background: '#181c1f'
  surface-variant: '#e0e3e6'
typography:
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  gutter: 24px
  section-gap: 48px
---

## Brand & Style

This design system is anchored in the concept of "Digital Sanctuary." It is specifically engineered for mental health peer-support, where the UI must act as a calming presence rather than a source of cognitive friction. The brand personality is empathetic, steady, and non-judgmental.

The design style utilizes **Modern Minimalism** mixed with **Soft Tonal Layering**. By prioritizing heavy whitespace and a reduction of visual noise, the system ensures that users in potentially distressed states feel a sense of immediate order and tranquility. Transitions should be slow and purposeful, avoiding any rapid or jarring animations.

## Colors

The palette is derived from natural, soothing elements to evoke a sense of safety and organic growth.

- **Primary (Sky Blue):** Used for primary actions and brand presence. It represents clarity and calm.
- **Secondary (Sage Green):** Used for success states, growth indicators, and secondary supportive elements.
- **Tertiary (Warm Sand):** Used for large surface areas and background containers to provide a warmer, more human feel than pure white or cold gray.
- **Neutral (Slate):** A soft off-black used for typography to maintain high legibility without the harsh contrast of #000000.

Avoid using high-saturation reds or oranges; for error states, use a muted terracotta to remain noticeable but not alarming.

## Typography

This design system uses **Public Sans** for its institutional yet accessible character. It provides the clarity required for health-related information while maintaining a friendly, neutral tone.

To reduce cognitive load:
- **Line Height:** All body text utilizes a generous line height (minimum 1.6x) to prevent "crowding" of words.
- **Paragraph Spacing:** Maintain at least 1em of space between paragraphs.
- **Max Width:** Limit text containers to 65-70 characters per line to enhance readability and focus.

## Layout & Spacing

The layout follows a **Fluid Grid** model with significant "breathing room." 

- **Mobile:** A 4-column grid with 20px margins. Elements are typically stacked vertically to simplify the mental model of the page.
- **Desktop:** A 12-column grid centered within a max-width of 1140px. 
- **Spacing Rhythm:** Based on an 8px base unit. Use larger increments (32px, 48px, 64px) for vertical section spacing to create a sense of openness and prevent the UI from feeling "cramped."

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

- **Level 0 (Background):** The Warm Sand (#F4EDE3) serves as the base canvas.
- **Level 1 (Cards/Surfaces):** Pure white surfaces sit atop the background. These should feature an extra-diffused shadow (Blur: 20px, Y: 4px, Opacity: 4%) tinted with the primary color to feel integrated into the environment.
- **Interactive States:** On hover or tap, elements should slightly increase their shadow spread rather than change color drastically, mimicking a gentle physical lift.

## Shapes

The shape language is consistently **Rounded**. Sharp corners are avoided to eliminate any "visual aggression." 

- **Standard Elements:** Buttons, inputs, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Content blocks and feature cards use a 1rem (16px) radius.
- **Encouragement Elements:** Badges or progress indicators may use "Pill" shapes (full rounding) to feel more playful and supportive.

## Components

- **Buttons:** Primary buttons should be large (min-height: 48px) with significant horizontal padding. Use the Primary Blue with white text. Secondary buttons use a Sage Green ghost style (border only).
- **Input Fields:** Fields must have a background color slightly darker than the page surface to define the interactive area clearly. Use a 2px border on focus in the Primary Blue.
- **Cards:** Used to wrap peer-support stories or resources. They must always have a white background and a 16px padding minimum.
- **Chips:** Used for mood tagging. These should be low-contrast (light gray or light blue backgrounds) to avoid drawing too much attention away from the primary content.
- **Empathetic Iconography:** Use rounded, "duotone" icons. Avoid thin, sharp lines. Icons should feel "soft" and illustrative rather than purely functional.
- **Progress Indicators:** Use smooth, continuous bars rather than stepped indicators to represent journeys or sessions, emphasizing a "flow" state.