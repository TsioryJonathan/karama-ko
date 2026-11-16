/**
 * Quiet page background: two slow colour clouds under a fine paper grain.
 * `fixed` pins it to the viewport, so only one screen of it is ever painted on long pages.
 */
export function GrainField({ fixed = false }: { fixed?: boolean }) {
  return <div className="grain-field" data-fixed={fixed || undefined} aria-hidden="true" />
}
