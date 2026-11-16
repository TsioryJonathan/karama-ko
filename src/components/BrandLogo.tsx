import { BrandMark } from './BrandMark'

/** Shared lockup for navigation and brand signatures; the text names the link. */
export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-logo">
      <BrandMark size={size} />
      <span className="brand-logo-label">Karama-Ko</span>
    </span>
  )
}
