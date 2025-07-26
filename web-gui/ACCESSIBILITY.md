# Accessibility Implementation Guide

This document outlines the accessibility features implemented in the DinoAir web application and provides guidelines for maintaining and extending accessibility support.

## Overview

The DinoAir application has been enhanced with comprehensive accessibility features to ensure compliance with WCAG 2.1 AA standards and provide an inclusive user experience for all users, including those using assistive technologies.

## Implemented Features

### 1. ARIA (Accessible Rich Internet Applications) Support

#### Semantic HTML and ARIA Roles
- **Landmarks**: `banner`, `main`, `navigation`, `dialog`, `toolbar`
- **Interactive Elements**: `tab`, `tabpanel`, `tablist`, `menuitem`, `button`
- **Content Structure**: `alert`, `progressbar`, `region`, `separator`

#### ARIA Properties
- `aria-label`: Descriptive labels for interactive elements
- `aria-labelledby`: References to heading elements
- `aria-describedby`: References to descriptive text
- `aria-expanded`: State of collapsible elements
- `aria-selected`: State of selectable elements
- `aria-current`: Current page/step indicators
- `aria-hidden`: Decorative elements hidden from screen readers
- `aria-live`: Dynamic content announcements
- `aria-atomic`: Complete region announcements

### 2. Keyboard Navigation

#### Tab Management
- Proper tab order throughout the application
- Focus trapping in modals and dialogs
- Focus restoration when closing modals
- Skip links for main content navigation

#### Keyboard Shortcuts
- `Ctrl/Cmd + /`: Open keyboard shortcuts modal
- `Ctrl/Cmd + ,`: Open settings panel
- `Ctrl/Cmd + M`: Open monitoring dashboard
- `Escape`: Close modals and dialogs
- `Tab`/`Shift+Tab`: Navigate between interactive elements

### 3. Screen Reader Support

#### Live Regions
- Toast notifications with appropriate urgency levels
- Navigation announcements
- Dynamic content updates
- Progress indicators

#### Descriptive Content
- Alternative text for icons
- Screen reader-only descriptions
- Context-aware labels
- Structured content hierarchy

### 4. Focus Management

#### Visual Indicators
- High-contrast focus outlines
- Consistent focus styling
- Visible focus indicators for all interactive elements

#### Programmatic Focus
- Auto-focus on modal open
- Focus trapping within dialogs
- Focus restoration on modal close
- Logical focus order

### 5. Color and Contrast

#### Theme Support
- Light and dark theme options
- System theme preference detection
- High contrast mode support
- Sufficient color contrast ratios

#### Visual Design
- Color is not the only means of conveying information
- Focus indicators are visible in all themes
- Error states are clearly indicated

### 6. Responsive Design

#### Mobile Accessibility
- Touch target sizes meet minimum requirements (44px)
- Mobile-specific navigation patterns
- Responsive focus management
- Gesture alternatives for all interactions

## Implementation Details

### Custom Hooks

#### `useScreenReader`
Provides screen reader announcement functionality:
```typescript
const { announceNavigation, announceAction, announceError } = useScreenReader();
```

#### `useFocusManagement`
Handles focus management for modals and dialogs:
```typescript
const { containerRef } = useFocusManagement(isOpen, {
  restoreFocus: true,
  trapFocus: true,
  autoFocus: true
});
```

### CSS Classes

#### Screen Reader Utilities
- `.sr-only`: Hide content visually but keep it available to screen readers
- `.focus:not-sr-only`: Show hidden content when focused

#### Focus Management
- High-contrast focus indicators
- Consistent focus styling across components
- Reduced motion support for users with vestibular disorders

### Component Patterns

#### Modal/Dialog Pattern
```jsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  ref={containerRef}
  tabIndex={-1}
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description</p>
</div>
```

#### Tab Pattern
```jsx
<div role="tablist" aria-label="Navigation">
  <button
    role="tab"
    aria-selected={isActive}
    aria-controls="panel-id"
    id="tab-id"
  >
    Tab Label
  </button>
</div>
<div
  role="tabpanel"
  id="panel-id"
  aria-labelledby="tab-id"
  hidden={!isActive}
>
  Panel content
</div>
```

## Testing Guidelines

### Manual Testing
1. **Keyboard Navigation**: Navigate the entire application using only the keyboard
2. **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
3. **Focus Management**: Verify focus moves logically and is always visible
4. **Color Contrast**: Check contrast ratios meet WCAG AA standards

### Automated Testing
- Accessibility tests are integrated into the Playwright test suite
- axe-core is used for automated accessibility scanning
- Tests run in CI/CD pipeline to catch regressions

### Browser Testing
- Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- Test with different screen readers
- Test with various assistive technologies

## Maintenance Guidelines

### Adding New Components
1. Include appropriate ARIA roles and properties
2. Ensure keyboard accessibility
3. Add focus management if needed
4. Test with screen readers
5. Update accessibility tests

### Code Review Checklist
- [ ] Semantic HTML elements used where appropriate
- [ ] ARIA attributes added for complex interactions
- [ ] Keyboard navigation works correctly
- [ ] Focus management is implemented for modals
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader announcements are appropriate
- [ ] Accessibility tests are updated

### Common Patterns to Follow
1. Always provide alternative text for images and icons
2. Use semantic HTML elements before adding ARIA roles
3. Ensure all interactive elements are keyboard accessible
4. Provide clear focus indicators
5. Use appropriate heading hierarchy
6. Include skip links for main content areas

## Resources

### WCAG Guidelines
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&levels=aa)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

### Screen Readers
- [NVDA (Windows)](https://www.nvaccess.org/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS/iOS)](https://www.apple.com/accessibility/mac/vision/)
- [TalkBack (Android)](https://support.google.com/accessibility/android/answer/6283677)

## Support

For questions about accessibility implementation or to report accessibility issues, please:
1. Check this documentation first
2. Review the WCAG guidelines
3. Test with actual assistive technologies
4. Create an issue with detailed reproduction steps

Remember: Accessibility is not a one-time implementation but an ongoing commitment to inclusive design.
