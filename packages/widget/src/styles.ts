// Blends into the host page: inherits its font and colours, no own background. Adjust with the --toka-*
// variables or style the exposed parts: ::part(item | link | meta | state | credit).
export const styles = `
:host {
  display: block;
  font: inherit;
  color: inherit;
  --toka-accent: currentColor;
  --toka-muted: color-mix(in srgb, currentColor 65%, transparent);
  --toka-gap: 0.75em;
  --toka-radius: 999px;
}
:host([hidden]) { display: none; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--toka-gap); }
li { display: grid; gap: 0.2em; }
a { color: var(--toka-accent); font-weight: 600; text-decoration: underline; text-underline-offset: 0.15em; }
a:focus-visible { outline: 2px solid var(--toka-accent); outline-offset: 2px; }
.meta { color: var(--toka-muted); font-size: 0.9em; }
.tags { display: flex; flex-wrap: wrap; gap: 0.4em; }
.state {
  display: inline-block; font-size: 0.8em; padding: 0.1em 0.6em;
  border: 1px solid currentColor; border-radius: var(--toka-radius);
}
.state.confirmed { color: var(--toka-accent); }
.cancelled a, .cancelled .meta { text-decoration: line-through; }
.status, .credit { color: var(--toka-muted); font-size: 0.85em; margin: var(--toka-gap) 0 0; }
.credit a { font-weight: inherit; color: inherit; }
`;
