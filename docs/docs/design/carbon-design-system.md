---
title: Carbon Design System rules
sidebar_position: 1
description: Follow Relay's non-negotiable Carbon component and accessibility rules.
---

# Carbon Design System rules

Relay uses the official [`@carbon/react`](https://carbondesignsystem.com/developing/frameworks/react/) implementation. Carbon is a product dependency and interaction contract, not only a visual reference.

## Before implementing interface work

1. Find the relevant Carbon component or pattern documentation.
2. Confirm that the pinned stable package ships it.
3. Record the documentation link in the pull request.
4. Compose the shipped component without replacing its markup, focus behavior, or states.
5. Test the result with a keyboard, light/dark themes, and automated accessibility checks.

## Do

- Use Carbon Grid and Stack for layout and spacing.
- Use Carbon type, color, spacing, layer, motion, and breakpoint tokens.
- Use Carbon icons only.
- Use dedicated full pages for complex forms.
- Use modals for short, focused flows or destructive confirmation.
- Give every field a visible label and useful validation.
- Represent unsupported platform settings explicitly.

## Do not

- Recreate buttons, inputs, modals, menus, tables, tags, notifications, or navigation.
- Copy Carbon markup into local components.
- Restyle Carbon internals with brittle selectors.
- Introduce arbitrary hex colors, spacing, icon libraries, or typefaces.
- Add experimental Carbon packages without an accepted architecture decision.
- invent a drawer, tree, or data control because an imagined design needs one.

Domain components may compose Carbon controls. For example, a `ConnectionContext` can arrange Carbon Tags, structured text, and a Notification, but it cannot introduce a custom badge or button.

## Accessibility

Relay targets WCAG 2.2 AA. Interactive changes require keyboard operation, visible focus, logical focus order, screen-reader labels, announced validation, reduced-motion support, and testing at common operating-system scaling levels.

See the official [Carbon accessibility guidance](https://carbondesignsystem.com/guidelines/accessibility/developers/).
