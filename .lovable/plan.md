Apply the designer's three feedback items to `src/pages/Landing.tsx` (and small tweaks in `src/index.css` only if needed for border consistency).

## Changes

1. **Hero headline — remove blue accent**
   - In the H1, drop `<span className="text-brand-blue">GTM team.</span>` and render the whole headline in `text-foreground` (ink). Keep the exact wording: "The flight simulator for your GTM team."
   - Leave the final CTA card headline ("Make your team rehearse.") untouched — feedback is scoped to the hero.

2. **Nav "Remix template" CTA — black, not blue**
   - Change the nav button from `bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground` to the default ink primary (`bg-primary text-primary-foreground hover:bg-primary/90`) so it doesn't compete with the large blue hero CTA.
   - Hero CTA and final CTA stay blue.

3. **Outline consistency across cards**
   - Current state is mixed: feature cards, how-it-works cards, and FAQ use `border-0` + `shadow-card`; the product-preview card and final CTA card use `border-2 border-ink/80`. That inconsistency is what the designer is calling out.
   - Resolution: standardize on the thinner, shadow-led style. Remove `border-2 border-ink/80` from the product-preview card and the final CTA card, and let `shadow-elevated` (plus the dark `bg-ink` on the final CTA) carry the weight.
   - Keep all card radii and shadows as-is otherwise.

## Out of scope

- No copy changes beyond removing the blue span wrapper.
- No token/theme edits; borders/shadows already exist in the design system.
- No changes to other pages.
