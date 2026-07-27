# MALUS — Design- & Physik-Brief

> Synthese aus 228 lokal vorliegenden Papern + 66 verifizierten Repos.
> Quelle der Wahrheit: `research/manifest.json` · `research/INDEX.md` · `research/repos/_repos.json`
> **Regel für alle Agents:** Keine Aussage auf der Website, die nicht entweder hier belegt
> oder im Abschnitt „Ungeprüft" als ungeprüft markiert ist.

---

## 0a. Die Jury-Kriterien (bekannt seit 2026-07-27)

**3D Websites Hackathon.** Kein Themenzwang. Wörtlich:

> „The judging is based primarily on **creativity, aesthetics, and overall experience**.
> **Technical complexity is optional.** A beautiful and creative project can outperform a
> highly technical one." · „We are looking for projects that make people stop scrolling and
> say: *Wow*."

**Pflichtabgabe:** öffentlicher Link · Projektbeschreibung mit Idee & Inspiration ·
**mindestens 3 Screenshots** · Technologieliste · Quellcode. Demo-Video (1–5 min) **optional**.
Erlaubt: KI-Tools, KI-generierte Assets, fremde Assets, Templates, Tutorials.
Ausdrückliche Regel: *„Participants must have the right to use any assets included."*

### Was das für den Bau ändert

1. **Technik ist Mittel, nie Selbstzweck.** Der Splat-Moment zählt, weil er *schön und
   unheimlich echt* ist — nicht weil er State of the Art ist. Jede Entscheidung wird an
   „sieht das umwerfend aus?" gemessen, nicht an „ist das anspruchsvoll?".
2. **Physik-HUD wird radikal reduziert.** Zahlen auf dem Schirm lesen sich als „technisch"
   und verstoßen gegen Gesetz 5 (Absorption). Die Physik bleibt vollständig — sie *treibt
   die Bilder*, statt sich als Messwerte auszustellen. Einzige Ausnahme: der Turgor-Regler
   in Akt III, weil er dort das Erlebnis selbst ist.
3. **Acht Akte werden sechs.** „Verlust" ist keine eigene Szene, sondern die zweite Hälfte
   des Obstgartens: er leuchtet auf, dann erlischt er. Bei Ästhetik als Hauptkriterium
   schlagen sechs perfekte Akte acht gehetzte.
4. **Hero-Frames sind ein Design-Constraint.** Screenshots sind Pflicht und werden von Jurys
   zuerst gesehen. Jeder Akt braucht mindestens einen Moment, der **als Standbild** umhaut.
   Viele 3D-Seiten wirken nur in Bewegung — das ist hier ein Ausschlusskriterium.
   Zielliste: Biss-Moment (Saft in der Luft), Splat-Makro der Schale, Pentagramm-Schnitt,
   Obstgarten in voller Weite, Erlöschen.
5. **Video ist optional → kompakt statt lang.** ~90 s, reines Bildmaterial, kein Voiceover-
   Architekturvortrag. Die freiwerdende Zeit geht in Politur.
6. **GSAP ist ausdrücklich als erlaubte Technologie gelistet** → Lizenzblocker aus Abschnitt 5
   erledigt.
7. **KI-Assets sind erlaubt** → Apfel-Quelle darf generiert werden. Die Rechte-Regel bleibt:
   alles CC0/CC-BY mit dokumentierter Herkunft, `three-pinata` bleibt draußen.

### Aktstruktur final

`KERN` (Laden) → `I FALL` → `II HAUT` → `III BISS` → `IV STERN` → `V ZEIT` →
`VI KLON & VERLUST` → `SAMEN` (Outro)

---

## 0. Was die Forschung am Konzept geändert hat

Der ursprüngliche Plan war ästhetisch begründet. Drei Befunde haben ihn **inhaltlich** umgebaut:

1. **Glanz hat eigene Neuronen** — und zwar für exakt drei Parameter. Das macht aus „schöner Shader" eine gezielte Ansprache dedizierter Wahrnehmungs-Hardware.
2. **Knackig vs. mehlig ist ein Bruchmechanik-Unterschied**, kein Frischeunterschied. Das gibt Akt III eine echte, lehrbare Mechanik statt eines Effekts.
3. **Die Domestikation lief andersherum** als erzählt. Das dreht die Erzählung der zweiten Hälfte um — und macht Akt VII tragisch statt sentimental.

---

## 1. Material & Rendering

### 1.1 Glanz — die drei Parameter, für die das Gehirn Neuronen hat

Im inferotemporalen Cortex (Bank des STS) existieren Neuronen, die **selektiv auf Glanz** reagieren. Ihre Selektivität ist entlang dreier physikalischer Reflexionsparameter organisiert: **spekulare Reflexion (ρs)**, **diffuse Reflexion (ρd)** und **Streuung des Glanzlichts (α)**. Die Populationsantwort kodiert den wahrgenommenen Glanz, und die Tuning-Richtungen sind in Richtung *zunehmenden* Glanzes verzerrt.

- `papers/gloss-perception-.../2012-neural-selectivity-and...md`
- `papers/gloss-perception-.../2014-perceptual-gloss-param...md`

> **Design-Konsequenz:** Der Kutikula-Shader exponiert genau `rhoS`, `rhoD`, `alpha` als Uniforms — nicht „roughness/metalness". In Akt II fahren wir diese drei Achsen kontrolliert durch, während die Kamera über die Schale kriecht. Wir polieren nicht ein Material; wir bewegen uns durch einen Wahrnehmungsraum, für den das Gehirn eine eigene Karte besitzt. Die Verzerrung Richtung „mehr Glanz" ist die Erlaubnis, leicht zu übertreiben — Supernormalität ohne Kitsch.

### 1.2 Transluzenz ist nicht Glanz

Glanzwahrnehmung wird zusätzlich durch **Lichttransmission** beeinflusst; klassische Appearance-Modelle behandeln nur opake Oberflächen und greifen bei transluzenten Materialien zu kurz. Es gibt einen eigenen perzeptuellen Raum für Transluzenz.

- `papers/subsurface-scattering-.../2020-survey-of-models-for-a...md`
- `papers/subsurface-scattering-.../2004-real-time-rendering-of...md` (Echtzeit-Verfahren)
- `papers/subsurface-scattering-.../2026-gtsr-subsurface-scatte...md` — **SSS-aware Gaussians**: trennt Oberflächen-Gaussians von Streuungs-Gaussians

> **Design-Konsequenz:** Zwei getrennte Schichten, nie eine. Schale = Oberflächen-BRDF mit ρs/ρd/α. Fruchtfleisch = Transmissions-/Streuungsschicht. Genau die Trennung, die GTSR auch im Splat-Raum vornimmt — unser Splat+Shader-Hybrid ist damit nicht improvisiert, sondern die gleiche Architektur wie der State of the Art.

### 1.3 Die Kutikula ist ein aktives Bauteil

Die Fruchtkutikula ist der unerwartete Hauptakteur für Haltbarkeit; Kutikula-Phenole leisten **strahlungslose UV-Deaktivierung** — die Schale wandelt UV in Wärme statt in Schaden.

- `papers/fruit-cuticle-.../2019-shelf-life-potential-a...md`
- `papers/fruit-cuticle-.../2022-radiationless-mechanis...md`

> **Design-Konsequenz & Faktenmoment in Akt II:** Der Glanz ist kein Wachs von außen — es ist ein selbstgebauter UV-Schutzschild, der Strahlung schluckt. Visualisierung: UV-Photonen treffen die Schale und verlöschen als Wärme, statt zu reflektieren. Ein Effekt, der eine echte physikalische Aussage macht.

---

## 2. Der Biss — die wichtigste Erkenntnis der ganzen Recherche

### 2.1 Knackig und mehlig sind zwei verschiedene Bruchwege

Beim Vergleich von `Honeycrisp` mit seinen Elternsorten zeigte sich: Honeycrisp hält 6 Monate Kühllager knackig, die Eltern werden weich. Ursache ist die **Zellwandintegrität in Kombination mit dem Turgorpotenzial**. Tensile-Tests haben die Adhäsion zwischen Nachbarzellen gemessen und den Druck bestimmt, bei dem Zellen **platzen**. Reife, mehlig gewordene Äpfel brechen anders als weniger reife.

- `papers/turgor-pressure-.../1999-comparison-of-softenin...md`
- `papers/fracture-mechanics-plant-tissue-.../` (Zellwand-Abbau beim Reifen, AFM-Nanostruktur)

**Die Mechanik in einem Satz:**

| | Bruchweg | Folge |
|---|---|---|
| **Knackig** | Riss geht **durch die Zellen** — sie platzen unter Turgordruck | Saft tritt aus, laut, hell |
| **Mehlig** | Riss geht **zwischen den Zellen** entlang der Mittellamelle | Zellen bleiben ganz, kein Saft, dumpf, trocken |

> **Design-Konsequenz — das wird Akt III:** Der Biss ist kein Effekt, er ist eine **umschaltbare Simulation**. Im Physik-HUD gibt es einen einzigen Regler: *Turgor*. Hoch → der Riss verläuft durch die Zellen, Saft spritzt, der Klang ist scharf und hell. Runter → der Riss sucht sich den Weg um die Zellen herum, kein Saft, dumpfes Knirschen, das Bruchbild ist rundlich statt scharfkantig.
>
> Derselbe Apfel. Ein Parameter. Zwei völlig verschiedene sinnliche Erlebnisse — und der Nutzer versteht in fünf Sekunden, warum ein alter Apfel sich falsch anfühlt. **Das ist der Moment, den die Jury erinnert.**

### 2.2 Fraktur-Technik: was im Browser realistisch ist

Echtzeit-Bruchmechanik-Verfahren (Boundary-Element-Approximationen, Phase-Field mit expliziter Festigkeitsfläche, kohäsive Zonenmodelle) sind für Offline-Simulation gedacht.

- `papers/real-time-fracture-.../2016-fast-approximations-fo...md`
- `papers/fracture-mechanics-.../2026-cohesive-phase-field-f...md`

> **Entscheidung:** Kein Laufzeit-Solver. Wir nutzen **Vorfrakturierung mit Voronoi-Zellen**, deren Zellzentren aus der Parenchym-Zellverteilung abgeleitet sind, plus laufzeitliche Auswahl der aktivierten Bruchflächen abhängig von Aufschlagpunkt und Turgor-Uniform. Der Riss *sucht* zur Laufzeit seinen Pfad (durch oder um Zellen) — das ist billig und trifft genau den Befund aus 2.1.
>
> ⚠️ **Lizenz-Blocker:** `dgreenheck/three-pinata` (409★) wäre die naheliegende Fertiglösung, hat aber **keine Lizenzdatei** → rechtlich „all rights reserved", für eine Hackathon-Einreichung unbrauchbar. Eigenimplementierung ist eingeplant. Nutzbare MIT-Bausteine: `gkjohnson/three-mesh-bvh` (Schnitt-Beschleunigung), `pmndrs/react-three-rapier` + `dimforge/rapier.js` (Apache-2.0) für die Dynamik.

---

## 3. Wahrnehmung & Psychologie

### 3.1 Klang verändert, was man sieht und schmeckt

Robuste crossmodale Assoziationen zwischen Lebensmitteln und Klang/Form sind auch bei Nicht-Synästhetikern belegt: Chips werden als „takete" (scharf, kantig) bewertet, Brie als „maluma" (rund, weich). Musik verschiebt die Weinwahrnehmung messbar, Umgebungsklänge die Schokoladenwahrnehmung.

- `papers/crossmodal-correspondence-.../2010-what-sound-does-that-t...md`
- `papers/crossmodal-correspondence-.../2014-cross-cultural-differe...md`
- `.../2019 environmental sounds influence multisensory perception of chocolate`
- `.../2016 wine and music (I): crossmodal matching`

> **Design-Konsequenz — Audio-Gesetz:** Klang ist keine Vertonung, er ist ein Bildparameter.
> - Hohe Frequenzen, scharfe Transienten, kurze Decay-Zeiten → knackig, frisch, sauer, **kantige Geometrie**
> - Tiefe Frequenzen, weiche Attacks, lange Decays → reif, süß, mehlig, **runde Geometrie**
>
> Die Audiokurve läuft synchron zur Form- und Farbkurve. Wenn in Akt V die Bräunung einsetzt, wandert der Klang gleichzeitig nach unten und wird runder. Der Nutzer merkt es nicht bewusst — er nimmt es als „das Bild fühlt sich alt an" wahr.

### 3.2 Farbe trägt Reife-Semantik

Farbe hat belegten psychologischen Einfluss auf Lebensmittelwahrnehmung; Anthocyan-Antwort in der Apfelschale ist direkt an Ethylen und Reifebeschleunigung gekoppelt („Red to Brown").

- `papers/crossmodal-.../2015-on-the-psychological-i...md`
- `papers/enzymatic-browning-.../2019-red-to-brown-an-elevate...md`

> **Design-Konsequenz:** Die Farbdramaturgie ist keine Stimmung, sie ist eine **Reifeachse**. Sättigung hoch = jung, saftig, süß. Sättigung runter Richtung Braun = Zeit, Verfall. Der Bogen der Seite ist damit farblich ein Reifungsprozess — der Nutzer liest ihn ohne Text.

### 3.3 Awe — der „Wow, wie geht das?"-Effekt ist erforscht

Awe wird über **Vastness** (Weite) und **Need for Accommodation** (Zwang, das eigene Weltmodell anzupassen) definiert. Awe erzeugt verringerten Selbstfokus, verändert die Körperwahrnehmung und ist über immersive Videos experimentell induzierbar. Entscheidend: der Persönlichkeitszug **Absorption** (Fähigkeit, sich vollständig in einen äußeren Reiz zu vertiefen) sagt die Awe-Stärke vorher — und lässt sich durch Instruktion *experimentell erhöhen*.

- `papers/awe-wonder-.../2022-awe-as-a-pathway-to-me...md`
- `papers/awe-wonder-.../2017-effectiveness-of-immer...md`
- `papers/awe-wonder-.../2018-neural-basis-of-dispos...md`

> **Design-Konsequenzen — drei harte Regeln:**
>
> **(a) Vastness entsteht durch Maßstabssprünge, nicht durch Größe.** Von 10.000 Äpfeln auf eine einzelne Zellwand und zurück. Der Apfel ist klein — unsere Weite ist die Skala, nicht der Raum.
>
> **(b) Die Fakten sind der zweite Awe-Motor, nicht Dekoration.** „Need for Accommodation" heißt: Der Nutzer muss sein Weltbild korrigieren. Genau das leistet ein Satz wie *„Jeder Gala-Apfel der Welt ist derselbe Baum."* Jeder Akt braucht **einen** solchen Satz. Nicht drei.
>
> **(c) Absorption schützen ist wichtiger als jedes Feature.** Kein Cookie-Vorhang über der Szene, kein Popup, kein Chrome, keine Scroll-Indikatoren nach Akt I, kein sichtbares Loading nach dem Start. Alles, was aus der Vertiefung reißt, senkt den Effekt messbar. **Im Zweifel: Element streichen.**

### 3.4 Neugier läuft über dieselbe Schaltung wie Hunger

Die Entscheidung, Neugier zu befriedigen, und die Entscheidung, Hunger zu befriedigen, teilen sich **überlappende striatale Aktivität** auf Ebene der Belohnungsschaltkreise. Neugier und Interesse verbessern zudem die Gedächtnisleistung.

- `papers/curiosity-.../2020-shared-striatal-activity...md`
- `papers/curiosity-.../2020-states-of-curiosity-and-...md`

> **Design-Konsequenz:** Bei einer Website über Essen ist die Verschmelzung von Wissenshunger und Appetit kein Wortspiel — es ist derselbe Schaltkreis. Deshalb:
> - Jeder Akt **endet mit einer offenen Frage**, nicht mit einem Abschluss. Der Cliffhanger ist die Scroll-Motivation.
> - Die Fakten kommen **nach** dem sinnlichen Reiz, nie davor. Erst der Biss, dann die Erklärung — die Belohnung ist dann schon aktiv.

### 3.5 Der Fluency-Konflikt und seine Auflösung

Ästhetisches Gefallen korreliert mit **Verarbeitungsleichtigkeit** (belegt bis auf ERP-Ebene). Gleichzeitig wollen wir maximale visuelle Komplexität.

- `papers/processing-fluency-.../2015-aesthetic-appreciation...md`
- `papers/processing-fluency-.../2017-computational-and-expe...md`

> **Auflösung — Kerngesetz der Seite:**
> **Komplexität im Bild. Radikale Einfachheit in der Interaktion.**
> Ein einziges Verb pro Akt. Scrollen. Oder halten. Oder ziehen. Nie zwei gleichzeitig, nie eine Erklärung, wie es geht. Die Szene darf überwältigend sein — die Bedienung nie.

---

## 4. Botanik, Chemie, Erzählung

### 4.1 Die Umkehrung: der Apfel hat uns rekrutiert

Domestikation ist am besten als **natürliche evolutionäre Antwort auf Herbivorie** modelliert — nicht als absichtsvoller menschlicher Prozess. Frühe Domestikationsmerkmale verschafften Pflanzen einen Selektionsvorteil, indem sie **Menschen als Samenverbreiter anwarben**. Viele Kulturpflanzen-Vorfahren waren zuvor auf Tiere als Verbreiter angewiesen. Ergänzend: es existieren Früchte, deren ursprüngliche Verbreiter (Megafauna) ausgestorben sind — „Dispersal Anachronisms".

- `papers/megafauna-seed-dispersal-.../2020-anthropogenic-seed-disper...md`
- `papers/megafauna-seed-dispersal-.../2008-seed-dispersal-anachronis...md`

> **Design-Konsequenz — das dreht die zweite Hälfte:** Der Satz in Akt VI lautet nicht „Wir haben den Apfel gezüchtet", sondern:
>
> **„You were never the farmer. You were the deal."**
>
> Der Apfel wurde süß, groß und rot, weil das eine Spezies anlockte, die ihn über Kontinente trägt. Es war ein Handel: Zucker gegen Verbreitung.
> Und damit wird **Akt VII (Verlust) tragisch statt sentimental**: Der Handel wurde gebrochen — von der Seite, die den Zucker bekommen hat. Wir haben die Verbreitung übernommen und die Vielfalt kassiert.

### 4.2 Genom & Klonalität (Akt VI)

Referenz für alle Sorten-/Klon-Aussagen: `papers/malus-domestica-.../2010-the-genome-of-the-domes...md`, ergänzt durch die High-Quality-de-novo-Assembly (2017) und die phased diploid Genome/Pan-Genome-Arbeit (2020) zur genetischen Geschichte.

> ⚠️ **Konkrete Zahlen (Genanzahl, Heterozygotiegrad, Sortenzahlen) müssen vor Verwendung aus diesen lokalen Dateien gezogen werden** — nicht aus dem Gedächtnis. Siehe Abschnitt 6.

### 4.3 Bräunung — die Chemie von Akt V

Bräunung entsteht durch **Polyphenoloxidasen (PPO)** nach Zellschädigung (Seneszenz, Verwundung, Schädlingsbefall); PPOs spielen zugleich eine Rolle in der pflanzlichen Immunabwehr. Zusätzlich wurde **MdLAC7 (Laccase 7)** als Faktor der Apfelschalenbräunung identifiziert, mit CRISPR/Cas9-Knockout bestätigt. Hemmung gelingt physikalisch (Hitze, Kälte, Bestrahlung, Ultraschall) und chemisch — als beste Behandlung für Apfelscheiben erwies sich eine Kombination aus **1 % Ascorbinsäure + 1 % Zitronensäure** mit Warmwasserbehandlung (70 °C für Golden Delicious, 60 °C für Elstar).

- `papers/enzymatic-browning-.../2024-inhibition-of-polypheno...md`
- `papers/enzymatic-browning-.../2020-assessment-of-enzymatic...md`

> **Design-Konsequenz:** Der Zitronentropfen ist chemisch korrekt und **quantifizierbar** — 1 % Ascorbinsäure + 1 % Zitronensäure steht als echter Wert im HUD. Die Shader-Kette bildet ab: *Verletzung → O₂-Kontakt → PPO oxidiert Phenole → Chinone → Polymerisation zu melaninartigen Pigmenten.* Mathematische Form: **Reaktions-Diffusion**, nicht linearer Farb-Lerp. Der Bräunungsrand wandert dann von selbst realistisch von der Schnittfläche nach innen.
>
> Zweite Ebene: PPO ist **Immunabwehr**. Der Apfel bräunt nicht, weil er stirbt — er bräunt, weil er sich wehrt. Das ist der Accommodation-Satz für Akt V.

### 4.4 Phyllotaxis ist selbstorganisiert, nicht gezeichnet (Akt IV)

Spiralmuster in Pflanzen entstehen **progressiv und selbstorganisiert**; Phyllotaxis wird als geometrische Kanalisierung während der Entwicklung beschrieben und ist bemerkenswert **robust gegenüber Rauschen**.

- `papers/phyllotaxis-.../2020-phyllotaxis-as-geometric...md`
- `papers/phyllotaxis-.../2012-noise-and-robustness-in-...md`

> **Design-Konsequenz:** Wir **zeichnen keine Fibonacci-Spirale**. Wir simulieren Inhibitionsfelder und lassen das Muster entstehen — mit Rauschen, das es nicht zerstört. Ergebnis sieht organisch aus statt nach Infografik. Der Unterschied ist auf den ersten Blick sichtbar und genau der Grund, warum die Seite „echt" wirkt und nicht „generiert".

---

## 5. Technik-Entscheidungen (alle Repos API-verifiziert)

| Zweck | Paket | ★ | Lizenz |
|---|---|---|---|
| Kern | `mrdoob/three.js` | 114k | MIT |
| React-Layer | `pmndrs/react-three-fiber` · `pmndrs/drei` | 31.5k · 9.8k | MIT |
| Splats | `sparkjsdev/spark` · `mkkellogg/GaussianSplats3D` | 3.4k · 2.8k | MIT |
| Splat-Aufbereitung | `playcanvas/supersplat` | 9.7k | MIT |
| Physik | `pmndrs/react-three-rapier` · `dimforge/rapier.js` | 1.4k · 695 | MIT · Apache-2.0 |
| Schnitt/BVH | `gkjohnson/three-mesh-bvh` | 3.4k | MIT |
| Shader | `FarazzShaikh/THREE-CustomShaderMaterial` | 1.3k | MIT |
| Post | `pmndrs/postprocessing` · `0beqz/realism-effects` · `N8python/n8ao` | 2.8k · 1.7k · 488 | Zlib · MIT · CC0 |
| Scroll | `darkroomengineering/lenis` · `greensock/GSAP` | 15k · 27k | MIT · — |
| Audio | `Tonejs/Tone.js` | 14.7k | MIT |
| Assets | `donmccurdy/glTF-Transform` · `zeux/meshoptimizer` | 1.9k · 8.2k | MIT |
| Kamera | `yomotsu/camera-controls` | 2.4k | MIT |
| State | `pmndrs/zustand` | 58k | MIT |

⚠️ **GSAP-Lizenz ist auf GitHub nicht als SPDX gesetzt** — vor Einsatz prüfen (Standard-Lizenz ist für die meisten Fälle frei, `ScrollTrigger` war historisch Club-only). Fallback: reiner Lenis- + eigener Scroll-Driver, oder `motion`/`framer-motion`. **Muss vor Tag 1 geklärt sein.**

**Splat-Strategie (bestätigt: Splat + Shader kombiniert):** Ein einziger Akt trägt den echten Gaussian-Splatting-Scan als „das ist eine Fotografie, die sich dreht"-Moment. Alle deformierenden/brechenden Akte laufen auf Mesh + eigenem Shader, weil Splats sich nicht sinnvoll zerbrechen lassen. GTSR (2026) bestätigt die Trennung von Oberflächen- und Streuungs-Gaussians als richtigen Weg.

---

## 6. Ungeprüft — NICHT ohne Verifikation auf die Website

Diese Behauptungen sind verbreitet und wirken gut, stehen aber **nicht** im lokalen Korpus. Sie brauchen vor Verwendung eine belastbare Quelle, sonst fliegen sie raus:

- Zahl der Apfelsorten weltweit / in den USA um 1900 / Anteil ausgestorbener Sorten
- „Almaty = Vater der Äpfel" · Tian-Shan-Ursprung als Einzelherkunft (Genom-Paper von 2010/2020 prüfen)
- „Äpfel bestehen zu 25 % aus Luft / schwimmen deshalb"
- Genanzahl des Apfelgenoms im Vergleich zum Menschen
- Alle Sortengründungsjahre und „jeder Gala ist derselbe Baum"-Detailangaben
- Zampini & Spence Chips-Experiment (crossmodale Grundlage ist belegt, **dieses spezifische Experiment liegt nicht lokal vor**)
- Newtons Apfelbaum, Johnny Appleseed/Cider, botanische Pome-/Hypanthium-Aussage, Pentagramm-Symbolik

> Verfahren: entweder aus den lokalen Genom-Papern belegen, gezielt nachrecherchieren, oder auf der Seite weglassen. **Eine falsche Zahl auf einer Seite, die mit Wissenschaftlichkeit auftritt, kostet mehr als der Fakt bringt.**

---

## 7. Die Gesetze (nicht verhandelbar)

1. **Ein Verb pro Akt.** Komplexität ins Bild, nie in die Bedienung.
2. **Ein Accommodation-Satz pro Akt.** Der eine Fakt, der das Weltbild korrigiert. Nicht drei.
3. **Reiz vor Erklärung.** Erst spüren, dann verstehen.
4. **Klang folgt Form und Reife.** Kantig+hell = knackig. Rund+dunkel = reif/alt.
5. **Absorption ist heilig.** Nichts, was aus der Vertiefung reißt. Im Zweifel streichen.
6. **Weite durch Maßstab.** Skalensprünge statt großer Räume.
7. **Jeder Akt endet mit einer Frage.**
8. **60 fps oder das Feature stirbt.** Ein ruckelndes Meisterwerk ist kein Meisterwerk.
9. **Keine unbelegte Zahl.** Siehe Abschnitt 6.

---

## 8. Offene Punkte vor Baubeginn

| # | Punkt | Blockiert |
|---|---|---|
| 1 | Hackathon-Kriterien vom Nutzer | Priorisierung, Criteria-Mapping |
| 2 | GSAP-Lizenzlage klären | Scroll-Architektur |
| 3 | Apfel-Quelle: eigener Scan vs. CC0-Photogrammetrie | Asset-Pipeline, Tag 1 |
| 4 | Ungeprüfte Fakten (Abschnitt 6) verifizieren | Texte der Akte IV, VI, VII |

---

*Recherche: 3 Runden, 1436 Treffer gesichtet, 228 kuratiert über 21 Achsen, 66 Repos verifiziert.
Sättigung bei 94 % Novelty **nicht** erreicht — bei Bedarf mit höherem Effort vertiefbar.*
