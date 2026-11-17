import { BrandLogo } from '../components/BrandLogo'
import type { ReactNode } from 'react'
import licenseText from '../../LICENSE?raw'
import { ThemeToggle } from '../components/ThemeToggle'
import { SCALE } from '../engine/compute'
import { formatAr } from '../lib/format'
import { LEGAL_PAGES, type LegalId } from './legal-pages'
import { SiteFooter } from './SiteFooter'

const UPDATED = '16 novembre 2026'
const GITHUB = 'https://github.com/TsioryJonathan'

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

const CONTENT: Record<LegalId, { lede: string; brief: string[]; body: ReactNode }> = {
  'mentions-legales': {
    lede: 'Qui publie Karama-Ko, où le site est hébergé et à qui s’adresser.',
    brief: [
      'Projet personnel, gratuit, sans publicité.',
      'Aucun lien avec une administration ou un organisme social.',
      'Contact : le profil GitHub de l’éditeur.',
    ],
    body: (
      <>
        <h2>Éditeur du site</h2>
        <p>
          Karama-Ko est un projet personnel, gratuit et sans but commercial. Il n’est rattaché à aucune
          administration, ni à la CNaPS, ni à un service médical interentreprises. Il n’affiche aucune
          publicité et ne vend aucune donnée.
        </p>
        <dl>
          <div>
            <dt>Éditeur et responsable de la publication</dt>
            <dd>Karama-Ko</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              <External href={GITHUB}>github.com/TsioryJonathan</External>
            </dd>
          </div>
        </dl>
        <h2>Hébergement</h2>
        <p>
          Le site n’est pas encore hébergé publiquement. Le nom et l’adresse de l’hébergeur seront indiqués ici
          dès la mise en ligne.
        </p>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le code source est publié sous <a href="#licence">licence MIT</a>. Les billets de la page d’accueil
          sont des illustrations originales, marquées « spécimen sans valeur » : ils ne reproduisent aucune
          coupure émise par la Banky Foiben’i Madagasikara. Les noms CNaPS, OSTIE et IRSA désignent des
          institutions et un impôt qui n’ont aucun lien avec ce site ; ils sont employés pour décrire les
          calculs.
        </p>
        <h2>Sources des calculs</h2>
        <p>
          Les taux et les tranches proviennent des textes officiels, cités avec leurs références sur la page{' '}
          <a href="#baremes">Barèmes et sources</a>. Le barème utilisé est en vigueur depuis le{' '}
          {new Date(SCALE.effectiveFrom).toLocaleDateString('fr-FR', { dateStyle: 'long' })}. Si vous
          constatez une erreur ou un barème dépassé, signalez-le : la correction passe par une mise à jour du
          code, avec la source officielle.
        </p>
        <h2>Mise à jour des barèmes</h2>
        <p>
          Les barèmes sont enregistrés avec leur date d’entrée en vigueur : un nouveau barème déjà vérifié
          s’applique de lui-même à sa date. Une veille hebdomadaire signale à l’éditeur tout changement des
          textes officiels cités ; il les relit, puis met le barème à jour à la main. Rien n’est modifié
          automatiquement. Quand un barème n’a pas été vérifié depuis plus de six mois, le site l’indique en
          haut des outils.
        </p>
        <h2>Signaler un contenu</h2>
        <p>
          Pour signaler une erreur de calcul, un contenu inexact ou une atteinte à vos droits, écrivez via{' '}
          <External href={GITHUB}>github.com/TsioryJonathan</External> en précisant la page concernée.
        </p>
      </>
    ),
  },
  confidentialite: {
    lede: 'Karama-Ko calcule dans votre navigateur. Il n’y a ni compte, ni publicité, ni suivi individuel, seulement des compteurs anonymes : voici précisément ce qui est gardé, où, et ce qui peut en sortir.',
    brief: [
      'Vos montants restent sur votre appareil.',
      'L’assistant envoie votre question, seulement quand vous la posez.',
      'Des compteurs anonymes comptent les visites, sans cookie, sans adresse, sans montant ni question.',
    ],
    body: (
      <>
        <h2>Qui est responsable</h2>
        <p>
          L’éditeur de Karama-Ko, indiqué dans les <a href="#mentions-legales">mentions légales</a>. Le
          contact est le profil GitHub de l’éditeur.
        </p>
        <h2>Les données que vous saisissez</h2>
        <p>
          Les salaires, les personnes à charge, les noms de simulations et les montants de votre fiche de paie
          sont traités dans votre navigateur pour produire le calcul. Ils ne sont pas envoyés au serveur de
          Karama-Ko lorsque vous utilisez les outils. L’éditeur n’y a pas accès et ne peut pas les consulter.
        </p>
        <p>
          Pour vous éviter de tout ressaisir, certaines saisies sont enregistrées dans le stockage de votre
          navigateur : le détail figure sur la page <a href="#cookies">Cookies et stockage local</a>.
        </p>
        <h2>Les compteurs anonymes</h2>
        <p>
          Pour savoir si le site sert à quelque chose, la page signale à Karama-Ko qu’une visite a eu lieu, quel
          outil a été ouvert et quelles options ont été utilisées (heures supplémentaires, OSTIE modifié, statut
          cadre, lien copié). Chaque événement est un simple nom dans une liste fermée, ajouté à un compteur du jour : par
          exemple « comparer : +1 ». Rien de ce que vous saisissez n’est envoyé, aucun cookie n’est déposé,
          l’adresse IP n’est pas enregistrée et rien ne permet de reconnaître une personne d’un jour à l’autre. Un événement est
          signalé une fois par onglet.
        </p>
        <p>
          Les compteurs sont gardés dans une base de données hébergée par Neon. Si votre navigateur demande à ne pas être
          suivi (« Do Not Track » ou « Global Privacy Control »), rien n’est signalé.
        </p>
        {/* The providers named below must match AI_PROVIDERS: name those that really receive the questions. */}
        <h2>L’assistant : le seul envoi de ce que vous écrivez</h2>
        <p>
          L’assistant n’agit que lorsque vous envoyez une question, ou que vous touchez « Pourquoi ce résultat ? ».
          Rien n’est envoyé avant. À ce moment, le navigateur transmet au serveur de Karama-Ko :
        </p>
        <ul>
          <li>votre question ;</li>
          <li>pour chaque simulation concernée, son nom, le salaire brut et le nombre de personnes à charge ;</li>
          <li>le nom de l’outil dans lequel vous êtes.</li>
        </ul>
        <p>
          Le serveur recalcule lui-même les montants, puis transmet ces informations à l’API d’un fournisseur
          d’intelligence artificielle tiers pour rédiger la réponse. Aujourd’hui, il s’agit de Groq, puis de
          Google (Gemini) et, en dernier recours, de DeepSeek (dont les serveurs sont situés en Chine) ; en cas
          d’indisponibilité ou de quota épuisé chez l’un, le suivant prend le relais. Karama-Ko n’enregistre ni
          votre question ni la réponse : il compte seulement qu’une question a été posée, et si la réponse a réussi,
          échoué ou été refusée, avec le temps qu’elle a pris.
        </p>
        <p>
          Ce service fonctionne surtout avec des offres gratuites. Les conditions d’un fournisseur, surtout gratuit,
          peuvent permettre de conserver les demandes et de les utiliser pour améliorer ses modèles : c’est
          une raison de plus de n’écrire aucune information personnelle. Consultez les conditions du
          fournisseur concerné. L’assistant peut aussi être indisponible quand le quota gratuit du jour est
          épuisé : les outils de calcul continuent de fonctionner.
        </p>
        <p>
          Votre adresse IP est retenue brièvement par le serveur, la journée au plus, pour limiter le
          nombre de demandes par personne et protéger le quota gratuit. Elle n’est ni écrite sur disque ni
          transmise au fournisseur d’IA. N’écrivez pas de nom ni d’information personnelle dans vos
          questions ou dans le nom d’une simulation : seuls des montants sont nécessaires.</p>
        <h2>Ce que Karama-Ko ne fait pas</h2>
        <ul>
          <li>Pas de compte, de mot de passe ni d’adresse e-mail demandée.</li>
          <li>Pas de cookie ni de traceur publicitaire, et pas de suivi individuel : seulement les compteurs anonymes décrits plus haut.</li>
          <li>Pas de revente, de partage commercial ni de profilage.</li>
          <li>Pas de police de caractères chargée depuis un autre site : elles sont servies par le site.</li>
        </ul>
        <h2>Journaux de l’hébergeur</h2>
        <p>
          Comme tout serveur web, l’hébergeur peut conserver des journaux techniques (adresse IP, date, page
          demandée) pour la sécurité et le fonctionnement du service. L’hébergeur sera nommé dans les mentions
          légales dès la mise en ligne ; sa propre politique s’applique à ces journaux.
        </p>
        <h2>Liens de partage</h2>
        <p>
          Un lien de partage contient les montants de la simulation dans son adresse. Toute personne qui le
          reçoit peut les lire, et l’adresse peut rester dans l’historique, les messageries ou les journaux
          des services par lesquels le lien transite. Ne le partagez qu’avec les personnes de votre choix.
        </p>
        <h2>Durée de conservation et effacement</h2>
        <p>
          Les données locales restent dans votre navigateur tant que vous ne les effacez pas. Pour tout
          supprimer : retirez vos simulations dans <a href="#atelier/sauvegardes">Mes simulations</a>, puis
          effacez les données du site dans les réglages de votre navigateur. Côté serveur, il n’y a rien à
          effacer : rien n’est conservé.
        </p>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander à savoir quelles données vous concernent, les faire corriger ou supprimer, et
          vous opposer à leur traitement, conformément à la loi malgache relative à la protection des données à
          caractère personnel (loi n° 2014-038). Karama-Ko ne détenant aucune donnée vous concernant, la
          réponse sera en pratique de vous indiquer comment effacer les données de votre navigateur. Écrivez
          via <External href={GITHUB}>github.com/TsioryJonathan</External>.
        </p>
        <h2>Mineurs</h2>
        <p>
          Le site s’adresse aux personnes qui travaillent ou recrutent. Il ne collecte aucune donnée
          permettant d’identifier un âge.
        </p>
        <h2>Évolution de cette politique</h2>
        <p>
          Toute évolution qui changerait ce qui est collecté ou envoyé sera indiquée ici avant sa mise en
          service, avec la date de mise à jour de la page.
        </p>
      </>
    ),
  },
  cookies: {
    lede: 'Karama-Ko n’utilise aucun cookie et ne vous suit pas. Il retient seulement vos préférences et votre travail, sur votre propre appareil.',
    brief: [
      'Aucun cookie, aucun traceur.',
      'Ce que vous saisissez reste sur votre appareil.',
      'Rien à accepter : aucun cookie, seulement des compteurs anonymes.',
    ],
    body: (
      <>
        <h2>Pourquoi il n’y a pas de bandeau</h2>
        <p>
          Un bandeau de consentement est nécessaire quand un site dépose des traceurs pour la publicité ou les
          statistiques. Karama-Ko n’en dépose aucun : ce qu’il retient répond à votre usage, pour que vous
          retrouviez votre travail.
        </p>
        <h2>Ce que le site retient sur votre appareil</h2>
        <ul>
          <li>votre choix de thème, clair ou sombre ;</li>
          <li>votre dernier calcul, pour le retrouver à votre retour ;</li>
          <li>le brouillon de votre atelier : offres, budget, postes, projection, avec les primes et avantages saisis ;</li>
          <li>les simulations que vous choisissez d’enregistrer, trente au maximum.</li>
        </ul>
        <p>
          Le stockage de session de l’onglet garde en plus un marqueur par visite ou par outil déjà compté, pour ne pas le compter deux fois.
          Il ne contient aucune donnée personnelle et disparaît à la fermeture de l’onglet.
        </p>
        <p>
          Tout cela reste sur votre appareil jusqu’à ce que vous l’effaciez. Le site ne l’envoie jamais de lui-même à
          Karama-Ko ; les seules exceptions sont ce que vous envoyez vous-même à l’assistant et les compteurs anonymes, décrits dans la{' '}
          <a href="#confidentialite">politique de confidentialité</a>.
        </p>
        <h2>Fonctionnement hors connexion</h2>
        <p>
          Le site peut être installé comme une application. Il garde alors une copie de ses propres pages pour
          s’ouvrir plus vite, même sans connexion. Cette copie ne contient aucune de vos données.
        </p>
        <h2>Tout effacer</h2>
        <p>
          Supprimez vos simulations dans <a href="#atelier/sauvegardes">Mes simulations</a>, puis effacez les
          données du site dans les réglages de votre navigateur. Le site continuera de fonctionner, avec ses
          réglages d’origine.
        </p>
      </>
    ),
  },
  conditions: {
    lede: 'Karama-Ko donne des estimations pour vous aider à comprendre un salaire. Il ne remplace ni une fiche de paie, ni un conseil professionnel.',
    brief: [
      'Les résultats sont des estimations, pas des documents officiels.',
      'Vérifiez auprès de votre employeur ou de l’administration avant toute décision.',
      'Service gratuit, fourni en l’état.',
    ],
    body: (
      <>
        <h2>Objet</h2>
        <p>
          Ces conditions encadrent l’usage du site Karama-Ko et de ses outils : calcul du net et du brut,
          comparaison d’offres, préparation d’une négociation ou d’une embauche, budget d’équipe, projection
          sur douze mois, rapprochement d’une fiche de paie, simulations enregistrées, calculateur intégrable
          et assistant. En utilisant le site, vous les acceptez.
        </p>
        <h2>Ce que calculent les outils</h2>
        <p>
          Les simulations concernent les salariés du secteur privé non agricole à Madagascar. Elles appliquent
          le barème {SCALE.year} : IRSA, cotisations CNaPS et OSTIE, avec un salaire minimum d’embauche de{' '}
          {formatAr(SCALE.minimumWage)}. Le barème est un instantané : il ne reconstitue pas les barèmes
          passés et ne prévoit pas les prochains.
        </p>
        <h2>Ce qu’ils ne prennent pas en compte</h2>
        <ul>
          <li>les régimes particuliers, les conventions collectives et les accords d’entreprise ;</li>
          <li>les absences, avances, retenues diverses et remboursements de frais ;</li>
          <li>
            le traitement des avantages en nature pour la CNaPS et l’OSTIE, et le régime fiscal et social des
            indemnités de fin de contrat ;
          </li>
          <li>les changements de barème postérieurs à la dernière mise à jour.</li>
        </ul>
        <h2>Primes, heures supplémentaires, avantages en nature</h2>
        <p>
          Le calculateur permet d’ajouter ces éléments, avec des hypothèses indiquées à l’écran. Les
          majorations des heures supplémentaires sont fixées par décret et par convention collective : les
          valeurs proposées (30 % puis 50 %) sont un usage courant, à adapter. La limite de 20 heures
          exonérées d’IRSA est appliquée par mois, faute de précision du texte sur la période. Les avantages
          en nature sont évalués selon l’article 01.03.08 du Code général des impôts.
        </p>
        <h2>Fin de contrat</h2>
        <p>
          L’outil « Fin de contrat » calcule l’indemnité de l’article 28 du Code du travail (licenciement
          économique ou arrêt de l’entreprise), l’indemnité de préavis non effectué et l’indemnité de congés
          non pris. La durée du préavis dépend de la convention collective ou d’un décret : c’est vous qui
          l’indiquez. Une convention, un accord ou votre contrat peuvent prévoir des montants plus favorables.
        </p>
        <h2>Valeur des résultats</h2>
        <p>
          Les montants affichés sont des estimations. Ils peuvent différer de votre fiche de paie réelle. Ils ne
          constituent ni un conseil juridique, fiscal ou comptable, ni une offre, ni un engagement d’un
          employeur. Le rapprochement d’une fiche de paie compare vos chiffres à ceux du calcul : un écart n’est
          pas une preuve d’erreur, et l’absence d’écart n’est pas une garantie de conformité. Avant une
          décision importante, vérifiez auprès de votre employeur, de la CNaPS, de votre service médical
          interentreprises ou de la Direction générale des impôts.
        </p>
        <h2>Assistant</h2>
        <p>
          Les réponses de l’assistant sont rédigées par un modèle d’intelligence artificielle à partir de vos
          simulations. Elles peuvent contenir des erreurs ou des omissions. Les montants calculés par les outils
          font foi, et non le texte de l’assistant. Il ne qualifie jamais une fiche de paie de correcte ou
          d’incorrecte. Elle est encadrée : l’assistant refuse les demandes étrangères à votre simulation (code, consignes à contourner, avis personnels), et ses réponses sont contrôlées avant d’être affichées, par exemple pour écarter un montant qui ne figure pas dans vos résultats. Ces contrôles réduisent les erreurs sans les supprimer. Son usage est facultatif et limité en nombre de demandes. Voir la{' '}
          <a href="#confidentialite">politique de confidentialité</a> pour les données envoyées.
        </p>
        <h2>Votre usage du site</h2>
        <p>
          Vous pouvez utiliser Karama-Ko librement, à titre personnel ou professionnel. Il est interdit
          d’empêcher son fonctionnement, de contourner les limites de l’assistant, d’envoyer des demandes
          automatisées en masse ou de présenter les résultats comme un document officiel.
        </p>
        <h2>Calculateur intégré</h2>
        <p>
          Le calculateur intégrable peut être placé sur un autre site. Son éditeur reste responsable du
          contexte dans lequel il le présente, et doit conserver le lien vers les barèmes et les sources.
        </p>
        <h2>Disponibilité et responsabilité</h2>
        <p>
          Le service est fourni gratuitement, en l’état et sans garantie de disponibilité ni d’exactitude
          absolue. L’éditeur s’efforce de maintenir le barème à jour, mais ne peut être tenu responsable d’une
          décision prise sur la seule base d’une simulation, ni d’une interruption du service. Rien dans ces
          conditions ne limite les droits que la loi vous reconnaît.
        </p>
        <h2>Liens externes</h2>
        <p>
          Les sources officielles citées renvoient vers des sites tiers dont le contenu n’est pas contrôlé par
          l’éditeur.
        </p>
        <h2>Modification et droit applicable</h2>
        <p>
          Ces conditions peuvent évoluer ; la date de mise à jour figure en bas de page. Elles sont soumises au
          droit malgache. En cas de difficulté, contactez d’abord l’éditeur via{' '}
          <External href={GITHUB}>github.com/TsioryJonathan</External>.
        </p>
      </>
    ),
  },
  accessibilite: {
    lede: 'Karama-Ko doit pouvoir être utilisé par tout le monde : au clavier, avec un lecteur d’écran, sur un petit écran, avec peu de mouvement. Voici où nous en sommes, sans rien promettre de plus.',
    brief: [
      'Objectif : le niveau AA des règles WCAG 2.1.',
      'Pas encore d’audit externe : les limites connues sont listées ci-dessous.',
      'Un problème d’accessibilité ? Signalez-le, il sera traité en priorité.',
    ],
    body: (
      <>
        <h2>Ce qui est prévu</h2>
        <ul>
          <li>Toutes les fonctions sont utilisables au clavier, avec un indicateur de focus visible.</li>
          <li>
            Les menus déroulants et les listes se pilotent aux flèches, avec Entrée pour choisir et Échap pour
            fermer.
          </li>
          <li>Les champs ont une étiquette visible ; les résultats importants sont annoncés aux lecteurs d’écran.</li>
          <li>Le thème clair et le thème sombre visent les contrastes de texte recommandés ; ils n’ont pas été mesurés par un outil indépendant.</li>
          <li>Les zones de toucher font au moins 44 pixels sur mobile.</li>
          <li>
            Les animations (billets, fonds, défilement) sont désactivées ou réduites si votre système demande
            moins de mouvement.
          </li>
          <li>Les tableaux ont des en-têtes ; le graphique a une description textuelle de sa valeur courante.</li>
        </ul>
        <h2>Limites connues</h2>
        <ul>
          <li>
            La scène 3D de la page d’accueil est purement décorative et masquée aux lecteurs d’écran. Les
            chiffres qu’elle illustre sont donnés en texte.
          </li>
          <li>Le graphique de l’outil « Explorer mon salaire » n’est pas navigable point par point : utilisez le champ et le curseur.</li>
          <li>Les réponses de l’assistant sont du texte généré : leur clarté peut varier.</li>
          <li>Ce site n’a pas encore fait l’objet d’un audit d’accessibilité par un tiers.</li>
        </ul>
        <h2>Signaler un problème</h2>
        <p>
          Si vous ne pouvez pas utiliser une fonction, écrivez via <External href={GITHUB}>github.com/TsioryJonathan</External>{' '}
          en indiquant la page, l’outil ou le lecteur d’écran utilisé. L’éditeur répond avec une solution de
          contournement dès que possible.
        </p>
      </>
    ),
  },
  licence: {
    lede: 'Le code de Karama-Ko est libre : vous pouvez le lire, le réutiliser et le modifier, à condition de conserver la mention de licence.',
    brief: [
      'Code sous licence MIT.',
      'Les polices ont leur propre licence.',
      'Barèmes : textes officiels malgaches.',
    ],
    body: (
      <>
        <h2>Licence MIT</h2>
        <pre>{licenseText}</pre>
        <h2>Crédits</h2>
        <ul>
          <li>Le site s’appuie sur des logiciels libres, utilisés selon leurs propres licences.</li>
          <li>
            Les polices Cabinet Grotesk et Satoshi (Indian Type Foundry, via{' '}
            <External href="https://www.fontshare.com">Fontshare</External>) suivent la licence de polices gratuites de
            Fontshare, distincte de la licence MIT.
          </li>
          <li>
            Les barèmes viennent des textes officiels malgaches, cités sur la page{' '}
            <a href="#baremes">Barèmes et sources</a>.
          </li>
        </ul>
      </>
    ),
  },
}

export default function Legal({ page }: { page: LegalId }) {
  const { title } = LEGAL_PAGES.find((p) => p.id === page)!
  const { lede, brief, body } = CONTENT[page]
  return (
    <div className="legal-page">
      <header className="legal-header print:hidden">
        <a href={location.pathname} className="home-wordmark">
          <BrandLogo />
        </a>
        <nav aria-label="Navigation principale">
          <a href={`${location.pathname}#outils`} className="btn btn-outline">
            Tous les outils
          </a>
          <ThemeToggle />
        </nav>
      </header>
      <div className="legal-layout">
        <nav className="legal-nav print:hidden" aria-label="Informations légales">
          {LEGAL_PAGES.map((p) => (
            <a key={p.id} href={`#${p.id}`} aria-current={p.id === page ? 'page' : undefined}>
              {p.title}
            </a>
          ))}
        </nav>
        <main className="legal-article">
          <h1>{title}</h1>
          <p className="legal-lede">{lede}</p>
          <aside className="legal-brief" aria-label="En bref">
            <p>En bref</p>
            <ul>
              {brief.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
          {body}
          <p className="legal-updated">Dernière mise à jour : {UPDATED}.</p>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
