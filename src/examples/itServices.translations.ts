/**
 * Hungarian and German texts for the IT services example, keyed by node id /
 * choice id. `applyTranslations` merges them into the tree's `translations` nodes.
 */
import type { DecisionTree, LocalizedText } from '../core/types';

type T = LocalizedText;

export const TREE_TEXTS: { title: T; description: T } = {
  title: {
    hu: 'Kestrel Digital – mi vagyunk a megfelelő partner?',
    de: 'Kestrel Digital – sind wir der richtige Partner?',
  },
  description: {
    hu: 'Példa: segít egy leendő ügyfélnek eldönteni, hogy egy felső-közép- és nagyvállalatokat kiszolgáló IT-szolgáltatóhoz forduljon-e (architektúra, DevOps, fejlesztés, tesztelés webre és mobilra).',
    de: 'Beispiel: hilft Interessenten bei der Entscheidung, ob sie einen IT-Dienstleister für den gehobenen Mittelstand und Großunternehmen beauftragen sollten (Architektur, DevOps, Entwicklung, Testing für Web & Mobile).',
  },
};

export const NODE_TEXTS: Record<string, { title?: T; body?: T; ctaLabel?: T }> = {
  start: {
    title: { hu: 'Mi hozott ma ide?', de: 'Was führt Sie heute zu uns?' },
    body: {
      hu: 'Válaszoljon néhány gyors kérdésre, és őszintén megmondjuk, hogy mi vagyunk-e a megfelelő partner – vagy hogy hol járna jobban.',
      de: 'Beantworten Sie ein paar kurze Fragen, und wir sagen Ihnen ehrlich, ob wir der richtige Partner sind – oder wo Sie besser aufgehoben wären.',
    },
  },
  what_build: {
    title: { hu: 'Mit szeretne építeni?', de: 'Was möchten Sie entwickeln?' },
    body: { hu: 'Válassza a terveihez legközelebb álló lehetőséget.', de: 'Wählen Sie die Option, die Ihren Plänen am nächsten kommt.' },
  },
  size: {
    title: { hu: 'Mekkora a szervezete?', de: 'Wie groß ist Ihr Unternehmen?' },
  },
  explore: {
    title: { hu: 'Mi lenne most a leghasznosabb Önnek?', de: 'Was wäre für Sie gerade am hilfreichsten?' },
    body: { hu: 'Semmi gond – nézzük meg, miben segíthetnénk.', de: 'Kein Problem – schauen wir, wo wir helfen könnten.' },
  },
  integrations: {
    title: { hu: 'Integrálni kell a meglévő rendszereikkel?', de: 'Muss die Lösung in Ihre bestehenden Systeme integriert werden?' },
    body: {
      hu: 'Például CRM, ERP, fizetési szolgáltatók, egyszeri bejelentkezés (SSO), régi háttérrendszerek…',
      de: 'Denken Sie an CRM, ERP, Zahlungsanbieter, Single Sign-on, Legacy-Backends…',
    },
  },
  team: {
    title: { hu: 'Van saját fejlesztőcsapatuk?', de: 'Haben Sie ein eigenes Entwicklungsteam?' },
  },
  budget: {
    title: { hu: 'Milyen költségkerettel számolnak?', de: 'Mit welchem Budget planen Sie?' },
    body: {
      hu: 'Elég egy hozzávetőleges érték – ez segít a megfelelő együttműködési formát javasolni.',
      de: 'Eine grobe Vorstellung genügt – so können wir die passende Form der Zusammenarbeit vorschlagen.',
    },
  },
  compliance: {
    title: { hu: 'Szabályozott vagy kritikus környezetben működnek?', de: 'Arbeiten Sie in einem regulierten oder geschäftskritischen Umfeld?' },
    body: {
      hu: 'Például pénzügy, egészségügy, közszféra – vagy bárhol, ahol egy leállás komoly pénzbe kerül.',
      de: 'Zum Beispiel Finanzwesen, Gesundheitswesen, öffentlicher Sektor – oder überall dort, wo Ausfälle richtig Geld kosten.',
    },
  },
  pains: {
    title: { hu: 'Mi okozza a legtöbb gondot?', de: 'Wo drückt der Schuh am meisten?' },
    body: {
      hu: 'Egyszerre egyet válasszon – utána továbbiakat is hozzáadhat. Eddig kiválasztva: {{pains}}.',
      de: 'Wählen Sie jeweils einen Punkt – weitere können Sie danach ergänzen. Bisher ausgewählt: {{pains}}.',
    },
  },
  platforms: {
    title: { hu: 'Milyen platformokon fut a rendszer?', de: 'Auf welchen Plattformen läuft das System?' },
  },
  advice_topic: {
    title: { hu: 'Miben kérne tanácsot?', de: 'Wozu wünschen Sie sich Beratung?' },
  },
  advice_scope: {
    title: { hu: 'Milyen jellegű együttműködést keres?', de: 'Welche Art der Zusammenarbeit suchen Sie?' },
  },
  diy_site: {
    title: { hu: 'Önnek egy kész platform a legjobb választás', de: 'Eine fertige Plattform ist für Sie die beste Wahl' },
    body: {
      hu: 'Egy céges weboldalhoz vagy kis webáruházhoz az egyedi fejlesztés túlzás lenne. A **WordPress**, a **Webflow**, a **Squarespace** vagy a **Shopify** segítségével napok alatt, a költségek töredékéért elindulhat.\n\nMi nagy, sok integrációt igénylő platformokra szakosodtunk – de ha szeretné, hogy egy szakértő átnézze a terveit, rövid eseti konzultációt is kínálunk.',
      de: 'Für eine Unternehmenswebsite oder einen kleinen Shop wäre eine Individualentwicklung übertrieben. Mit **WordPress**, **Webflow**, **Squarespace** oder **Shopify** sind Sie in wenigen Tagen online – zu einem Bruchteil der Kosten.\n\nWir haben uns auf große, integrationsintensive Plattformen spezialisiert – wenn ein Experte Ihre Pläne aber einmal prüfen soll, bieten wir auch kurze Ad-hoc-Beratungen an.',
    },
  },
  adhoc_consult: {
    title: { hu: 'Eseti szakértői konzultáció', de: 'Ad-hoc-Expertenberatung' },
    body: {
      hu: 'Foglaljon egy egy- vagy kétórás konzultációt egyik vezető architektusunkkal. Ideális kisebb csapatoknak, akiknek második vélemény kell technológiai döntésekről, üzemeltetésről, biztonságról vagy beszállítói ajánlatokról – hosszú távú elköteleződés nélkül.',
      de: 'Buchen Sie eine ein- bis zweistündige Session mit einem unserer Senior-Architekten. Ideal für kleinere Teams, die eine zweite Meinung zu Technologieentscheidungen, Hosting, Sicherheit oder Anbieterangeboten brauchen – ganz ohne langfristige Bindung.',
    },
    ctaLabel: { hu: 'Időpont foglalása', de: 'Termin buchen' },
  },
  full_delivery: {
    title: { hu: 'Teljes körű fejlesztési partnerség', de: 'End-to-End-Partnerschaft' },
    body: {
      hu: 'Pontosan a mi profilunkba illik (illeszkedési pontszám: {{fit}}, összetettség: {{complexity}}). Egy kéthetes feltáró workshoppal kezdenénk, majd egy többfunkciós csapatot állítanánk össze – architektusokkal, web- és mobilfejlesztőkkel, DevOps- és tesztmérnökökkel –, hogy megtervezzük, felépítsük és üzemeltessük a platformját.',
      de: 'Sie passen genau in unser Profil (Passwert {{fit}}, Komplexität {{complexity}}). Wir würden mit einem zweiwöchigen Discovery-Workshop beginnen und dann ein cross-funktionales Team aufstellen – Architekten, Web- und Mobile-Entwickler, DevOps- und Testingenieure –, das Ihre Plattform konzipiert, entwickelt und betreibt.',
    },
    ctaLabel: { hu: 'Feltáró workshop egyeztetése', de: 'Discovery-Workshop vereinbaren' },
  },
  devops_engagement: {
    title: { hu: 'DevOps és platform engineering', de: 'DevOps & Platform Engineering' },
    body: {
      hu: 'A legnagyobb nyereséget az hozza, ahogyan a szoftver készül, kikerül és üzemel. DevOps-mérnökeink a csapatukkal együtt kiépítik a CI/CD-t, az infrastruktúra kódként kezelését, a megfigyelhetőséget és az ügyeleti gyakorlatot.',
      de: 'Ihr größter Hebel liegt darin, wie Software gebaut, ausgeliefert und betrieben wird. Unsere DevOps-Engineers bauen gemeinsam mit Ihrem Team CI/CD, Infrastructure as Code, Observability und Bereitschaftsprozesse auf.',
    },
    ctaLabel: { hu: 'Beszéljen DevOps-vezetőnkkel', de: 'Mit einem DevOps-Lead sprechen' },
  },
  qa_engagement: {
    title: { hu: 'Tesztelés és minőségbiztosítás', de: 'Testing & Quality Engineering' },
    body: {
      hu: 'Tesztstratégiát vezetünk be, automatizáljuk a regressziós tesztelést webre és mobilra, és QA-mérnököket integrálunk a csapataikba, hogy kevesebb hiba jusson el a felhasználókhoz.',
      de: 'Wir führen eine Teststrategie ein, automatisieren Regressionstests für Web und Mobile und integrieren QA-Engineers in Ihre Teams, damit weniger Fehler bei Ihren Nutzern ankommen.',
    },
    ctaLabel: { hu: 'Beszéljen QA-vezetőnkkel', de: 'Mit einem QA-Lead sprechen' },
  },
  arch_partnership: {
    title: { hu: 'Architektúra-tanácsadás', de: 'Architekturberatung' },
    body: {
      hu: 'Egy vezető architektus több hónapon át dolgozik a csapatukkal: célarchitektúra, skálázhatóság, integrációs stratégia és technikai irányítás.',
      de: 'Ein Senior-Architekt arbeitet über mehrere Monate mit Ihrem Team: Zielarchitektur, Skalierbarkeit, Integrationsstrategie und technische Governance.',
    },
    ctaLabel: { hu: 'Beszéljen egy architektussal', de: 'Mit einem Architekten sprechen' },
  },
  arch_review: {
    title: { hu: 'Architektúra-felülvizsgálat', de: 'Architektur-Review' },
    body: {
      hu: 'A rendszerük rögzített terjedelmű felülvizsgálata (jellemzően 2–3 hét), amely írásos jelentéssel és priorizált ütemtervvel zárul.',
      de: 'Ein Review Ihres Systems mit festem Umfang (typischerweise 2–3 Wochen), das mit einem schriftlichen Bericht und einer priorisierten Roadmap abschließt.',
    },
    ctaLabel: { hu: 'Felülvizsgálat kérése', de: 'Review anfragen' },
  },
  discovery_call: {
    title: { hu: 'Beszéljünk!', de: 'Lassen Sie uns sprechen' },
    body: {
      hu: 'Pusztán ezekből a válaszokból nem tudjuk eldönteni – egy 30 perces beszélgetés gyorsan tisztázza a helyzetet.',
      de: 'Allein anhand dieser Antworten können wir das nicht beurteilen – ein 30-minütiges Gespräch klärt es schnell.',
    },
    ctaLabel: { hu: 'Hívás egyeztetése', de: 'Gespräch vereinbaren' },
  },
  off_platform: {
    title: { hu: 'Valószínűleg nem mi vagyunk a megfelelő partner', de: 'Wir sind wahrscheinlich nicht der richtige Partner' },
    body: {
      hu: 'Kizárólag web- és mobilplatformokkal foglalkozunk, így asztali, beágyazott vagy játékfejlesztéshez egy erre szakosodott stúdió jobban kiszolgálja Önt.',
      de: 'Wir konzentrieren uns ausschließlich auf Web- und Mobile-Plattformen – für Desktop-, Embedded- oder Spieleentwicklung ist ein spezialisiertes Studio die bessere Wahl.',
    },
  },
  curious: {
    title: { hu: 'Köszönjük, hogy benézett!', de: 'Danke für Ihren Besuch!' },
    body: {
      hu: 'Nagyobb szervezeteknek segítünk web- és mobilplatformokat tervezni, építeni, kiadni és tesztelni. Jöjjön vissza bármikor.',
      de: 'Wir helfen größeren Organisationen, Web- und Mobile-Plattformen zu konzipieren, zu entwickeln, auszuliefern und zu testen. Schauen Sie jederzeit wieder vorbei.',
    },
  },
};

export const CHOICE_TEXTS: Record<string, T> = {
  build: { hu: 'Új weboldalt, portált vagy alkalmazást szeretnénk', de: 'Wir möchten eine neue Website, ein Portal oder eine App entwickeln' },
  improve: {
    hu: 'Van egy rendszerünk, amely segítségre szorul (szállítási tempó, stabilitás, minőség)',
    de: 'Wir haben ein System, das Unterstützung braucht (Liefergeschwindigkeit, Stabilität, Qualität)',
  },
  advice: { hu: 'Szakértői tanácsra vagy második véleményre van szükségünk', de: 'Wir brauchen Expertenrat oder eine zweite Meinung' },
  explore: { hu: 'Csak körülnézek', de: 'Ich schaue mich nur um' },

  brochure: { hu: 'Céges / bemutatkozó weboldal', de: 'Eine Unternehmens- bzw. Präsentationswebsite' },
  shop: { hu: 'Webáruház', de: 'Ein Onlineshop' },
  portal: {
    hu: 'Ügyfélportál önkiszolgálással (fiókok, számlázás, ügyfélszolgálat)',
    de: 'Ein Kundenportal mit Self-Service (Konten, Abrechnung, Support)',
  },
  mobile_app: { hu: 'Mobilalkalmazás', de: 'Eine mobile App' },
  omni: { hu: 'Webportál és hozzá tartozó iOS / Android alkalmazások', de: 'Ein Webportal plus begleitende iOS-/Android-Apps' },
  internal: {
    hu: 'Belső vállalati platform (munkafolyamatok, irányítópultok, integrációk)',
    de: 'Eine interne Unternehmensplattform (Workflows, Dashboards, Integrationen)',
  },
  desktop: { hu: 'Asztali szoftver, beágyazott rendszer vagy játék', de: 'Desktop-Software, Embedded-System oder ein Spiel' },

  s1: { hu: 'Kevesebb mint 10 fő', de: 'Weniger als 10 Personen' },
  s2: { hu: '10 – 50 fő', de: '10 – 50 Personen' },
  s3: { hu: '50 – 250 fő', de: '50 – 250 Personen' },
  s4: { hu: '250 – 2000 fő', de: '250 – 2.000 Personen' },
  s5: { hu: 'Több mint 2000 fő', de: 'Mehr als 2.000 Personen' },

  x_build: { hu: 'Új digitális terméket tervezünk', de: 'Wir planen ein neues digitales Produkt' },
  x_improve: {
    hu: 'Egy meglévő rendszert gyorsabbá, stabilabbá vagy könnyebben kiadhatóvá tenni',
    de: 'Ein bestehendes System schneller, stabiler oder einfacher auslieferbar machen',
  },
  x_advice: { hu: 'Egy architektussal átbeszélni a technológiai döntéseinket', de: 'Mit einem Architekten über unsere Technologieentscheidungen sprechen' },
  x_curious: { hu: 'Őszintén szólva csak kíváncsi vagyok', de: 'Ehrlich gesagt bin ich nur neugierig' },

  int_many: { hu: 'Igen, több kulcsrendszerrel (ERP, CRM, SSO, fizetés)', de: 'Ja, mit mehreren Kernsystemen (ERP, CRM, SSO, Zahlungen)' },
  int_some: { hu: 'Néhány külső szolgáltatással', de: 'Mit einer Handvoll Drittanbieterdiensten' },
  int_none: { hu: 'Nem, önállóan működik', de: 'Nein, sie ist eigenständig' },

  team_strong: {
    hu: 'Igen, erős belső csapatunk van – szakértőkre van szükségünk a támogatásukhoz',
    de: 'Ja, ein starkes internes Team – wir brauchen Spezialisten zu seiner Unterstützung',
  },
  team_small: { hu: 'Kis csapatunk van, amelynek plusz kapacitás kell', de: 'Ein kleines Team, das zusätzliche Kapazität braucht' },
  team_none: { hu: 'Nincs, olyan partner kell, aki a teljes megvalósítást vállalja', de: 'Nein, wir brauchen einen Partner für die komplette Umsetzung' },

  b1: { hu: '15 000 € alatt', de: 'Unter 15.000 €' },
  b2: { hu: '15 000 – 75 000 €', de: '15.000 – 75.000 €' },
  b3: { hu: '75 000 – 300 000 €', de: '75.000 – 300.000 €' },
  b4: { hu: '300 000 € felett', de: 'Über 300.000 €' },
  b_unknown: { hu: 'Még nincs meghatározva', de: 'Noch nicht festgelegt' },

  reg_yes: { hu: 'Igen', de: 'Ja' },
  reg_no: { hu: 'Nem', de: 'Nein' },

  p_release: { hu: 'A kiadások lassúak, kézi munkát igényelnek vagy kockázatosak', de: 'Releases sind langsam, manuell oder riskant' },
  p_outage: { hu: 'Leállások és éles üzemi incidensek', de: 'Ausfälle und Produktionsvorfälle' },
  p_bugs: { hu: 'Túl sok hiba jut el a felhasználóinkhoz', de: 'Zu viele Fehler erreichen unsere Nutzer' },
  p_scale: { hu: 'A rendszer nem bírja a növekedést', de: 'Das System hält mit dem Wachstum nicht Schritt' },
  p_capacity: { hu: 'Nem tudunk elég gyorsan új funkciókat szállítani', de: 'Wir können Features nicht schnell genug ausliefern' },
  p_done: { hu: 'Ennyi volt', de: 'Das ist alles' },

  pl_web: { hu: 'Web', de: 'Web' },
  pl_mobile: { hu: 'Mobil (iOS / Android)', de: 'Mobile (iOS / Android)' },
  pl_both: { hu: 'Web és mobil is', de: 'Sowohl Web als auch Mobile' },
  pl_other: { hu: 'Főként asztali, nagygépes vagy beágyazott', de: 'Überwiegend Desktop, Mainframe oder Embedded' },

  a_arch: { hu: 'Egy meglévő rendszer architektúrájának felülvizsgálata', de: 'Review der Architektur eines bestehenden Systems' },
  a_stack: { hu: 'Technológiai stack kiválasztása egy új termékhez', de: 'Auswahl eines Technologie-Stacks für ein neues Produkt' },
  a_devops: { hu: 'Felhő-, CI/CD- és DevOps-stratégia', de: 'Cloud-, CI/CD- und DevOps-Strategie' },
  a_qa: { hu: 'Tesztstratégia és -automatizálás', de: 'Teststrategie und Testautomatisierung' },

  scope_oneoff: { hu: 'Egyszeri felülvizsgálat írásos jelentéssel', de: 'Ein einmaliges Review mit schriftlichem Bericht' },
  scope_ongoing: { hu: 'Folyamatos támogatás a csapatunk mellett', de: 'Laufende Begleitung an der Seite unseres Teams' },
  scope_unsure: { hu: 'Még nem tudom', de: 'Noch nicht sicher' },

  diy_consult: { hu: 'Azért egy rövid konzultációt szívesen kérnék', de: 'Ich hätte trotzdem gern eine kurze Beratung' },
  off_also_web: { hu: 'Web- vagy mobilfejlesztési igényünk is van', de: 'Wir haben auch Web- oder Mobile-Bedarf' },
  curious_back: { hu: 'Igazából van egy projektötletem', de: 'Eigentlich habe ich doch ein Projekt im Kopf' },
};

/** Writes the texts above into the tree's `translations` nodes. */
export function applyTranslations(tree: DecisionTree): DecisionTree {
  return {
    ...tree,
    translations: { title: TREE_TEXTS.title, description: TREE_TEXTS.description },
    nodes: tree.nodes.map((node) => {
      const texts = NODE_TEXTS[node.id];
      return {
        ...node,
        ...(texts ? { translations: texts } : {}),
        choices: node.choices.map((c) => (CHOICE_TEXTS[c.id] ? { ...c, translations: { label: CHOICE_TEXTS[c.id] } } : c)),
      };
    }),
  };
}
