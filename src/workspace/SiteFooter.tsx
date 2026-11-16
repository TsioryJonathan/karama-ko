import { BrandLogo } from '../components/BrandLogo'
import { LEGAL_PAGES } from './legal-pages'

const COLUMNS = [
  {
    title: 'Outils',
    links: [
      ['Calculer mon salaire', '#calculateur'],
      ['Comparer des offres', '#atelier/comparer'],
      ['Préparer une négociation', '#atelier/negocier'],
      ['Préparer une embauche', '#atelier/embaucher'],
    ],
  },
  {
    title: 'Ressources',
    links: [
      ['Barèmes et sources', '#baremes'],
      ['Mes simulations', '#atelier/sauvegardes'],
      ['Intégrer Karama-Ko', '#atelier/integrer'],
    ],
  },
  { title: 'Informations légales', links: LEGAL_PAGES.map((page) => [page.title, `#${page.id}`]) },
]

export function SiteFooter() {
  const home = location.pathname
  return (
    <footer className="site-footer print:hidden">
      <div className="site-footer-brand">
        <a href={home}><BrandLogo size={44} /></a>
        <p>Des outils pour comprendre et préparer un salaire à Madagascar, secteur privé non agricole.</p>
      </div>
      {COLUMNS.map((column) => (
        <nav key={column.title} aria-label={column.title}>
          <p>{column.title}</p>
          <ul>
            {column.links.map(([label, hash]) => (
              <li key={hash}>
                <a href={home + hash}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      ))}
      <p className="site-footer-note">
        © 2026 Karama-Ko. Code sous licence MIT. Barème d’octobre 2026 ; estimations hors primes et avantages
        en nature.
      </p>
    </footer>
  )
}
