---
title: Tailwind CSS Tips and Tricks
date: 2024-03-10
slug: tailwind-tips
tags: [css, tailwind, web-development]
description: Useful tips for working with Tailwind CSS
---

# Tailwind CSS Tips and Tricks

Tailwind CSS has become my go-to CSS framework. Here are some tips I've learned along the way.

## Tip 1: Use @apply Sparingly

While `@apply` is convenient, overusing it defeats the purpose of utility-first CSS. Use it for repeated component patterns only.

## Tip 2: Customize Your Config

Don't be afraid to customize `tailwind.config.js` to match your design system.

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#1234567'
      }
    }
  }
}
```

## Tip 3: Use JIT Mode

Just-in-time mode generates styles on-demand, resulting in faster build times and smaller CSS files.

Happy styling!
