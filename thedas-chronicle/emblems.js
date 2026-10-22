/* Thedas Chronicle emblem kit: original vector art for every answer.
 *
 * An emblem is {motif, mark, tone}:
 *   motif - the central picture (see MOTIFS), drawn in a 100x100 box
 *   mark  - an overlay telling the outcome (see MARKS), or "none"
 *   tone  - "neutral" | "good" | "bad" | "dead" | "mystic"
 * Emblems.url(spec, game, w, h) returns a data: URL for a w x h tile
 * (in tapestry units), suitable for CSS background-image.
 */
(function (root) {
  "use strict";

  const PALETTES = {
    dao: { bg1: "#6b1a14", bg2: "#1d0806", fg: "#ecd7a6", ink: "#2b1207", acc: "#d9a441" },
    da2: { bg1: "#16474a", bg2: "#061819", fg: "#e9dcbc", ink: "#0d1e1f", acc: "#d08e3e" },
    dai: { bg1: "#24452a", bg2: "#09150b", fg: "#ebdfb4", ink: "#152010", acc: "#86d46d" },
  };

  const TONES = {
    neutral: (p) => p,
    good: (p) => ({ ...p, acc: "#f3cf6b", glow: "#f3cf6b" }),
    bad: (p) => ({ ...p, bg1: mix(p.bg1, "#3a0505", 0.55), acc: "#d0503c", glow: "#a0201a" }),
    dead: (p) => ({ ...p, bg1: mix(p.bg1, "#2a2a2a", 0.7), bg2: "#0b0b0b", fg: "#b9b3a7", acc: "#8d877c" }),
    mystic: (p) => ({ ...p, bg1: mix(p.bg1, "#3b1f5c", 0.6), acc: "#b98cf0", glow: "#8f5ad6" }),
  };

  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  function ray(n, r1, r2, cx = 50, cy = 50) {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      d += `M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}L${(cx + Math.cos(a) * r2).toFixed(1)} ${(cy + Math.sin(a) * r2).toFixed(1)}`;
    }
    return d;
  }

  function starPath(cx, cy, r1, r2, n = 5) {
    let d = "";
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1;
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      d += (i ? "L" : "M") + (cx + Math.cos(a) * r).toFixed(1) + " " + (cy + Math.sin(a) * r).toFixed(1);
    }
    return d + "Z";
  }

  // Classes: f = filled shape, d = dark fill, a = accent fill, s = ink line, k = thick light line, h = highlight
  const SWORD = `<path class="f" d="M47 14L53 14L53 64L50 70L47 64Z"/><rect class="f" x="34" y="62" width="32" height="6" rx="2"/><rect class="d" x="47" y="68" width="6" height="13"/><circle class="a" cx="50" cy="84" r="4"/>`;
  const DAGGER = `<path class="f" d="M48 18L52 18L55 56L50 63L45 56Z"/><rect class="f" x="38" y="56" width="24" height="5" rx="2"/><rect class="d" x="47" y="61" width="6" height="14"/><circle class="a" cx="50" cy="78" r="3.5"/>`;
  const CROWN = `<path class="f" d="M22 70L26 36L38 52L50 30L62 52L74 36L78 70Z"/><rect class="f" x="22" y="70" width="56" height="10" rx="1"/><circle class="a" cx="26" cy="36" r="3.5"/><circle class="a" cx="50" cy="30" r="3.5"/><circle class="a" cx="74" cy="36" r="3.5"/><circle class="a" cx="50" cy="75" r="2.5"/>`;

  const MOTIFS = {
    crown: { label: "Crown: rulers, kings, queens, thrones", svg: CROWN },
    sword: { label: "Sword: warriors, battles, duels, templars", svg: SWORD },
    "crossed-swords": { label: "Crossed swords: conflict, war, rivalry, sides", svg: `<g transform="rotate(-38 50 50)">${SWORD}</g><g transform="rotate(38 50 50)">${SWORD}</g>` },
    dagger: { label: "Dagger: assassins, rogues, murder, betrayal", svg: `<g transform="rotate(35 50 50)">${DAGGER}</g>` },
    shield: { label: "Shield: protection, defense, the Grey Wardens, a hero", svg: `<path class="f" d="M50 16L78 25L76 52Q72 74 50 85Q28 74 24 52L22 25Z"/><path class="s" fill="none" d="M50 25L70 31L68 52Q65 68 50 77Q35 68 32 52L30 31Z"/><path class="a" d="M50 36L58 52L50 66L42 52Z"/>` },
    skull: { label: "Skull: death, the dead, undead", svg: `<path class="f" d="M30 50Q30 22 50 22Q70 22 70 50Q70 58 64 62L64 74L36 74L36 62Q30 58 30 50Z"/><circle class="d" cx="41" cy="48" r="6"/><circle class="d" cx="59" cy="48" r="6"/><path class="d" d="M50 54L46 62L54 62Z"/><path class="s" d="M43 66V74M50 66V74M57 66V74"/>` },
    tower: { label: "Tower: the Circle, a fortress, a mage tower", svg: `<path class="f" d="M34 22H42V28H46V22H54V28H58V22H66V36H34Z"/><rect class="f" x="38" y="36" width="24" height="48"/><rect class="d" x="46" y="44" width="8" height="12" rx="4"/><path class="d" d="M44 84V72Q50 66 56 72V84Z"/>` },
    castle: { label: "Castle: a keep, a city, a stronghold, nobility", svg: `<rect class="f" x="16" y="38" width="16" height="46"/><rect class="f" x="68" y="38" width="16" height="46"/><path class="a" d="M14 38L24 22L34 38Z"/><path class="a" d="M66 38L76 22L86 38Z"/><rect class="f" x="32" y="50" width="36" height="34"/><path class="f" d="M32 44H38V50H44V44H50V50H56V44H62V50H68V50H32Z"/><path class="d" d="M42 84V70Q50 62 58 70V84Z"/>` },
    tree: { label: "Tree: forests, the Dalish, nature, the Brecilian Forest", svg: `<path class="d" d="M46 86L48 60L42 52L49 55L56 48L52 60L54 86Z"/><circle class="f" cx="50" cy="34" r="18"/><circle class="f" cx="33" cy="46" r="12"/><circle class="f" cx="67" cy="46" r="12"/><path class="s" fill="none" d="M40 32Q50 26 60 32"/>` },
    wolf: { label: "Wolf: werewolves, beasts, curses, Fen'Harel", svg: `<path class="f" d="M24 18L38 38L50 34L62 38L76 18L76 46L67 58L59 82L50 88L41 82L33 58L24 46Z"/><path class="d" d="M36 47L45 51L37 54Z"/><path class="d" d="M64 47L55 51L63 54Z"/><path class="d" d="M45 79H55L50 85Z"/><path class="s" fill="none" d="M44 62L50 68L56 62"/>` },
    dragon: { label: "Dragon: dragons, the Archdemon, high dragons", svg: `<path class="f" d="M50 52L18 28L25 43L14 45L27 54L20 63L44 59Z"/><path class="f" d="M50 52L82 28L75 43L86 45L73 54L80 63L56 59Z"/><path class="f" d="M44 56Q50 40 56 56L54 76Q50 88 46 76Z"/><path class="f" d="M45 47L50 28L55 47Z"/><circle class="a" cx="48" cy="40" r="1.5"/><circle class="a" cx="52" cy="40" r="1.5"/>` },
    urn: { label: "Urn: relics, the Urn of Sacred Ashes, Andraste", svg: `<ellipse class="a" cx="50" cy="24" rx="14" ry="4"/><path class="f" d="M38 27H62V32Q72 40 70 58Q66 76 50 80Q34 76 30 58Q28 40 38 32Z"/><path class="s" d="M31 50H69M33 60H67"/><rect class="d" x="40" y="80" width="20" height="5"/>` },
    book: { label: "Book: lore, research, grimoires, scholars, records", svg: `<path class="f" d="M50 30Q38 24 22 28V74Q38 70 50 76Z"/><path class="f" d="M50 30Q62 24 78 28V74Q62 70 50 76Z"/><path class="s" fill="none" d="M28 40Q38 37 46 40M28 50Q38 47 46 50M28 60Q38 57 46 60M54 40Q62 37 72 40M54 50Q62 47 72 50M54 60Q62 57 72 60"/>` },
    mask: { label: "Mask: Orlais, deception, nobles, the Game, disguises", svg: `<path class="f" d="M24 34Q50 24 76 34Q78 60 62 76Q50 84 38 76Q22 60 24 34Z"/><path class="d" d="M33 46Q40 39 47 46Q40 51 33 46Z"/><path class="d" d="M53 46Q60 39 67 46Q60 51 53 46Z"/><path class="s" fill="none" d="M42 66Q50 70 58 66"/><path class="a" d="M50 28L53 36L50 40L47 36Z"/>` },
    anvil: { label: "Anvil: dwarves, smithing, golems, the Anvil of the Void", svg: `<path class="f" d="M18 40H70Q82 40 85 33Q85 48 70 52H64V60Q64 66 72 70H28Q36 66 36 60V52H30Q18 50 18 40Z"/><rect class="d" x="24" y="70" width="52" height="8"/>` },
    chains: { label: "Chains: prisoners, slavery, imprisonment, binding", svg: `<g class="k" fill="none"><ellipse cx="31" cy="69" rx="13" ry="7" transform="rotate(-45 31 69)"/><ellipse cx="50" cy="50" rx="7" ry="13" transform="rotate(-45 50 50)"/><ellipse cx="69" cy="31" rx="13" ry="7" transform="rotate(-45 69 31)"/></g>` },
    heart: { label: "Heart: romance, love, loyalty, friendship", svg: `<path class="f" d="M50 80L24 54Q14 42 22 32Q32 22 44 30L50 36L56 30Q68 22 78 32Q86 42 76 54Z"/><path class="h" d="M30 38Q34 32 40 34" fill="none"/>` },
    flame: { label: "Flame: fire, burning, destruction, zeal", svg: `<path class="f" d="M50 14Q60 34 68 44Q78 58 70 72Q62 85 50 85Q38 85 30 72Q22 58 34 44Q38 52 44 52Q38 36 50 14Z"/><path class="a" d="M50 50Q58 60 56 70Q54 78 50 78Q44 78 44 70Q44 62 50 50Z"/>` },
    eye: { label: "Eye: secrets, spies, knowledge, watchers, the Fade", svg: `<path class="f" d="M14 50Q50 18 86 50Q50 82 14 50Z"/><circle class="a" cx="50" cy="50" r="13"/><circle class="d" cx="50" cy="50" r="5.5"/>` },
    staff: { label: "Staff: mages, magic, apostates", svg: `<rect class="d" x="47.5" y="32" width="5" height="54" rx="2"/><circle class="a" cx="50" cy="25" r="9"/><path class="s" fill="none" d="M40 30Q42 15 50 13Q58 15 60 30"/>` },
    bow: { label: "Bow: archers, hunters, scouts", svg: `<path class="k" fill="none" d="M36 16Q72 50 36 84"/><path class="s" d="M36 16L36 84"/><path class="s" d="M26 50H80"/><path class="f" d="M84 50L74 44L74 56Z"/><path class="s" d="M26 50L20 44M26 50L20 56"/>` },
    key: { label: "Key: secrets unlocked, vaults, access, discoveries", svg: `<circle class="k" fill="none" cx="34" cy="34" r="12"/><path class="k" d="M43 43L78 78M64 64L72 56M72 72L80 64"/>` },
    coin: { label: "Coin: money, trade, merchants, bribes, debts", svg: `<circle class="f" cx="50" cy="50" r="27"/><circle class="s" fill="none" cx="50" cy="50" r="21"/><path class="a" d="M50 35L57 50L50 65L43 50Z"/>` },
    ship: { label: "Ship: sea voyages, pirates, Rivain, the Waking Sea", svg: `<path class="f" d="M18 60H82L72 76H28Z"/><rect class="d" x="48" y="18" width="4" height="42"/><path class="a" d="M52 22Q74 38 52 56Z"/><path class="f" d="M48 26Q30 40 48 55Z"/><path class="s" fill="none" d="M14 85Q22 81 30 85Q38 89 46 85Q54 81 62 85Q70 89 78 85Q84 82 88 85"/>` },
    mountain: { label: "Mountain: the Frostbacks, journeys, the Deep Roads entrance", svg: `<path class="f" d="M8 82L38 32L50 50L62 28L92 82Z"/><path class="a" d="M38 32L45 44L40 41L34 46L32 41Z"/><path class="a" d="M62 28L71 43L65 40L59 46L57 38Z"/>` },
    moon: { label: "Moon: night, the elven gods, Morrigan, hidden things", svg: `<path class="f" d="M60 16Q28 20 26 50Q28 80 60 84Q40 72 40 50Q40 28 60 16Z"/><circle class="a" cx="66" cy="34" r="2.5"/><circle class="a" cx="73" cy="52" r="2"/><circle class="a" cx="65" cy="67" r="2"/>` },
    sun: { label: "Sun: the Chantry, the Maker, hope, the Inquisition's dawn", svg: () => `<path class="k" d="${ray(12, 20, 34)}"/><circle class="a" cx="50" cy="50" r="15"/>` },
    lyrium: { label: "Lyrium crystal: lyrium, red lyrium, templar addiction", svg: `<path class="a" d="M50 12L62 40L50 86L38 40Z"/><path class="f" d="M35 46L44 56L40 82L27 60Z"/><path class="f" d="M65 46L73 60L60 82L56 56Z"/><path class="h" d="M50 18L55 40" fill="none"/>` },
    rose: { label: "Rose: Leliana, Orlesian romance, beauty, tributes", svg: `<path class="k" d="M50 54V86"/><path class="f" d="M50 72Q60 62 68 66Q60 76 50 72Z"/><path class="f" d="M50 66Q40 56 32 60Q40 70 50 66Z"/><circle class="f" cx="50" cy="40" r="15"/><path class="s" fill="none" d="M42 40Q50 30 58 40Q50 50 44 42"/>` },
    scroll: { label: "Scroll: decrees, treaties, letters, contracts", svg: `<rect class="f" x="30" y="24" width="40" height="52"/><ellipse class="a" cx="50" cy="24" rx="23" ry="6"/><ellipse class="a" cx="50" cy="76" rx="23" ry="6"/><path class="s" d="M37 38H63M37 47H63M37 56H58"/>` },
    gate: { label: "Gate: doors, sealed passages, Kirkwall's gallows, entry", svg: `<path class="f" d="M22 86V44Q50 12 78 44V86Z"/><path class="d" d="M31 86V48Q50 25 69 48V86Z"/><path class="k" d="M40 86V36M50 86V31M60 86V36"/>` },
    hand: { label: "Hand: a choice, an offer, mercy, a pact, a helping hand", svg: `<path class="f" d="M36 86V58L29 42Q28 35 35 37L42 49V26Q42 20 46 20Q50 20 50 26V46V22Q50 16 54 16Q58 16 58 22V46V26Q58 20 62 20Q66 20 66 26V52L70 42Q75 37 77 43L70 66Q66 80 60 86Z"/>` },
    candle: { label: "Candle: vigils, memorials, faith, remembrance", svg: `<path class="a" d="M50 18Q59 29 50 37Q41 29 50 18Z"/><rect class="f" x="42" y="40" width="16" height="40"/><ellipse class="d" cx="50" cy="82" rx="17" ry="4"/>` },
    banner: { label: "Banner: armies, factions, allegiance, recruitment", svg: `<path class="k" d="M30 14V88"/><path class="f" d="M32 18H76L67 35L76 52H32Z"/><circle class="a" cx="50" cy="35" r="7"/>` },
    helm: { label: "Helm: soldiers, knights, commanders, Chevaliers", svg: `<path class="f" d="M28 78V48Q28 20 50 20Q72 20 72 48V78H60V55H40V78Z"/><rect class="d" x="35" y="43" width="30" height="6"/><path class="k" fill="none" d="M50 20Q60 8 72 13"/>` },
    raven: { label: "Raven: messages, omens, shapeshifting, crows of Antiva", svg: `<path class="f" d="M22 62Q28 40 50 40Q58 30 66 32Q74 32 76 38L85 40L76 43Q72 51 64 57Q60 73 40 75L22 84L29 71Z"/><circle class="d" cx="68" cy="37" r="2"/>` },
    hammer: { label: "Hammer: smiths, labour, force, dwarven craft", svg: `<rect class="f" x="24" y="22" width="52" height="21" rx="3"/><rect class="d" x="46" y="43" width="8" height="42" rx="2"/>` },
    scales: { label: "Scales: judgment, justice, trials, verdicts", svg: `<rect class="d" x="48" y="22" width="4" height="58"/><rect class="f" x="20" y="28" width="60" height="4" rx="2"/><path class="s" d="M24 32L16 54M24 32L32 54M76 32L68 54M76 32L84 54"/><path class="f" d="M13 54Q24 65 35 54Z"/><path class="f" d="M65 54Q76 65 87 54Z"/><rect class="f" x="36" y="80" width="28" height="5"/>` },
    ring: { label: "Ring: marriage, oaths, alliances, signets", svg: `<circle class="k" fill="none" cx="50" cy="58" r="20"/><path class="a" d="M50 22L61 33L50 42L39 33Z"/>` },
    orb: { label: "Orb: artifacts, ancient magic, elven foci", svg: `<circle class="a" cx="50" cy="48" r="24"/><circle class="h" cx="41" cy="39" r="6"/><path class="f" d="M34 80H66L59 71H41Z"/>` },
    horns: { label: "Horns: the Qunari, Sten, the Arishok, Iron Bull", svg: `<path class="f" d="M32 70Q12 42 28 16Q28 42 44 58Z"/><path class="f" d="M68 70Q88 42 72 16Q72 42 56 58Z"/><rect class="f" x="38" y="54" width="24" height="24" rx="4"/><path class="d" d="M42 64H48M52 64H58"/>` },
    feather: { label: "Feather: freedom, birds, flight, Andraste's mercy", svg: `<path class="f" d="M72 14Q38 28 31 70L27 86L36 73Q68 62 72 14Z"/><path class="s" fill="none" d="M70 18Q48 44 31 80"/>` },
    tomb: { label: "Tomb: graves, burial, crypts, remembering the fallen", svg: `<path class="s" d="M14 86H86"/><path class="f" d="M30 86V40Q30 22 50 22Q70 22 70 40V86Z"/><rect class="d" x="47.5" y="32" width="5" height="32" rx="1"/><rect class="d" x="39" y="41" width="22" height="5" rx="1"/>` },
    cage: { label: "Cage: captivity, prisons, a trapped creature", svg: `<path class="k" fill="none" d="M28 40Q50 12 72 40"/><path class="k" d="M28 40V80M39 33V80M50 30V80M61 33V80M72 40V80"/><rect class="f" x="24" y="80" width="52" height="6"/><circle class="s" fill="none" cx="50" cy="16" r="4"/>` },
    potion: { label: "Potion: cures, poisons, alchemy, the Calling", svg: `<rect class="d" x="45" y="11" width="10" height="7"/><path class="f" d="M44 18H56V36Q74 46 72 64Q70 82 50 82Q30 82 28 64Q26 46 44 36Z"/><path class="a" d="M30 60Q50 54 70 60Q68 78 50 78Q32 78 30 60Z"/>` },
    chalice: { label: "Chalice: rituals, blood magic, feasts, offerings", svg: `<path class="f" d="M30 22H70Q70 52 54 58V72H64V80H36V72H46V58Q30 52 30 22Z"/><circle class="a" cx="50" cy="40" r="4"/>` },
    spider: { label: "Spider: the Deep Roads, broodmothers, creeping horrors", svg: `<path class="s" d="M44 50L24 36L18 22M44 56L20 56L12 46M44 62L22 74L16 88M56 50L76 36L82 22M56 56L80 56L88 46M56 62L78 74L84 88"/><circle class="f" cx="50" cy="42" r="10"/><circle class="f" cx="50" cy="64" r="14"/><circle class="a" cx="46" cy="40" r="1.8"/><circle class="a" cx="54" cy="40" r="1.8"/>` },
    lute: { label: "Lute: bards, songs, taverns, celebrations", svg: `<rect class="d" x="47" y="12" width="6" height="34"/><path class="f" d="M50 44Q71 46 71 64Q71 85 50 85Q29 85 29 64Q29 46 50 44Z"/><circle class="d" cx="50" cy="63" r="6"/><path class="s" d="M48.5 16V80M51.5 16V80"/>` },
    star: { label: "Star: destiny, a hero's fame, a special honour", svg: () => `<path class="a" d="${starPath(50, 50, 32, 13)}"/>` },
    hourglass: { label: "Hourglass: time, delays, the future, Redcliffe's time magic", svg: `<path class="f" d="M30 18H70V22Q70 40 54 50Q70 60 70 78V82H30V78Q30 60 46 50Q30 40 30 22Z"/><path class="a" d="M38 28H62Q58 40 50 46Q42 40 38 28Z"/><path class="a" d="M50 62Q60 70 62 78H38Q40 70 50 62Z"/>` },
    leaf: { label: "Leaf: healing herbs, the elves, renewal", svg: `<path class="f" d="M18 82Q18 28 82 18Q80 72 18 82Z"/><path class="s" fill="none" d="M20 80Q46 52 78 22"/>` },
    wings: { label: "Wings: griffons, the Grey Wardens' sigil, flight, rescue", svg: `<path class="f" d="M50 50Q30 18 8 32Q21 37 17 45Q29 45 25 54Q37 54 50 60Z"/><path class="f" d="M50 50Q70 18 92 32Q79 37 83 45Q71 45 75 54Q63 54 50 60Z"/><circle class="a" cx="50" cy="56" r="6"/>` },
    fist: { label: "Fist: rebellion, uprisings, brute strength, defiance", svg: `<path class="f" d="M30 44Q30 34 40 34H64Q72 34 72 44V62Q72 78 56 82H44Q30 80 30 66Z"/><path class="s" d="M40 34V46M48 34V46M56 34V46M64 34V46"/><path class="s" fill="none" d="M30 52Q44 50 50 58"/>` },
    figure: { label: "Figure: a person, a companion, a hero, a survivor", svg: `<circle class="f" cx="50" cy="28" r="10"/><path class="f" d="M32 86Q32 48 50 43Q68 48 68 86Z"/>` },
    child: { label: "Child: children, heirs, babies, the young", svg: `<circle class="f" cx="50" cy="42" r="8"/><path class="f" d="M37 84Q37 58 50 54Q63 58 63 84Z"/><path class="a" d="M50 22L53 29L50 33L47 29Z"/>` },
    house: { label: "House: home, family, villages, refugees", svg: `<path class="f" d="M24 50L50 28L76 50V84H24Z"/><path class="k" fill="none" d="M18 53L50 23L82 53"/><rect class="d" x="44" y="64" width="12" height="20"/><rect class="d" x="30" y="56" width="8" height="8"/><rect class="d" x="62" y="56" width="8" height="8"/>` },
    hood: { label: "Hood: cultists, assassins, darkspawn, Venatori, mysterious strangers", svg: `<path class="f" d="M28 86Q26 36 50 20Q74 36 72 86Z"/><path class="d" d="M39 62Q39 40 50 35Q61 40 61 62Q50 68 39 62Z"/><circle class="a" cx="45.5" cy="51" r="2.5"/><circle class="a" cx="54.5" cy="51" r="2.5"/>` },
    rift: { label: "Rift: the Breach, Fade rifts, demons crossing over", svg: `<path class="a" d="M55 10L44 33L57 39L42 59L55 66L46 90L64 62L51 56L66 35L53 29Z"/><path class="h" d="M53 18L48 32" fill="none"/>` },
    blood: { label: "Blood drop: blood magic, sacrifice, the taint", svg: `<path class="f" d="M50 14Q72 46 72 62Q72 84 50 84Q28 84 28 62Q28 46 50 14Z"/><path class="h" fill="none" d="M38 60Q38 50 44 42"/>` },
    tent: { label: "Tent: camps, armies on the march, the Inquisition's outposts", svg: `<path class="f" d="M14 82L50 22L86 82Z"/><path class="d" d="M42 82L50 56L58 82Z"/><path class="k" d="M50 22V12"/><path class="a" d="M50 12L62 16L50 20Z"/>` },
    dog: { label: "Hound: mabari war hounds, loyal beasts", svg: `<path class="f" d="M32 30Q50 20 68 30L70 60Q66 80 50 84Q34 80 30 60Z"/><path class="f" d="M33 31Q17 34 19 60Q28 56 33 47Z"/><path class="f" d="M67 31Q83 34 81 60Q72 56 67 47Z"/><ellipse class="f" cx="50" cy="68" rx="13" ry="10"/><ellipse class="d" cx="50" cy="62" rx="5" ry="3.5"/><circle class="d" cx="42" cy="47" r="3"/><circle class="d" cx="58" cy="47" r="3"/><path class="s" fill="none" d="M44 72Q50 76 56 72"/>` },
    // Poster-style subjects: large, close-cropped, lit from the left (class "sh" is the shadow side).
    bust: { label: "Bust: a named character (companion, ruler, rival); pair with crowned/dead/loved marks", svg: `<path class="f" d="M2 104L4 80Q8 64 24 61L40 65L44 104Z"/><path class="f" d="M98 104L96 80Q92 64 76 61L60 65L56 104Z"/><path class="sh" d="M98 104L96 80Q92 64 76 61L60 65L56 104Z"/><path class="d" d="M38 104L41 66L50 72L59 66L62 104Z"/><path class="f" d="M44 54H56V68L50 72L44 68Z"/><path class="f" d="M37 30Q37 16 50 15Q63 16 63 30V44Q62 55 55 60L50 63L45 60Q38 55 37 44Z"/><path class="sh" d="M50 15Q63 16 63 30V44Q62 55 55 60L50 63Z"/><path class="d" opacity=".5" d="M40 37Q44.5 34 49 37V41Q44.5 42.5 40 40ZM51 37Q55.5 34 60 37V40Q55.5 42.5 51 41Z"/><path class="d" opacity=".35" d="M49 39L50 51L53 51Z"/><path class="a" d="M37 27Q41 14 50 14Q59 14 63 27Q57 21 50 22Q43 21 37 27Z"/><path class="ln" d="M10 76Q18 68 28 72Q22 80 14 78M72 72Q82 68 90 76Q86 80 78 78M14 90Q24 85 34 90M66 90Q76 85 86 90"/>` },
    "tower-hill": { label: "Tower on a hill: a besieged keep, village or fortress under threat", svg: `<path class="d" d="M-6 106V82Q22 66 50 70Q78 66 106 80V106Z"/><path class="f" d="M38 20H44V25H47V20H53V25H56V20H62V30L60 74H40L38 30Z"/><path class="sh" d="M50 20H53V25H56V20H62V30L60 74H50Z"/><path class="d" d="M47 40Q50 35 53 40V48H47ZM46 74V64Q50 58 54 64V74Z"/><path class="ln" d="M40.5 34H59.5M40.8 54H59.2M43 44H46M54 60H58M42 64H45"/><path class="a" opacity=".9" d="M-6 106Q4 86 12 95Q14 78 24 91Q30 76 36 93Q42 83 46 97H54Q58 83 64 93Q70 76 76 91Q86 78 88 95Q96 86 106 106Z"/>` },
    mage: { label: "Hooded mage: a mage, apostate, cultist or spellcaster with a glowing staff", svg: `<circle class="glow" cx="78" cy="22" r="22"/><path class="d" d="M76.5 26H79.5L82 106H78Z"/><circle class="a" cx="78" cy="22" r="7"/><path class="ln" d="M70 25Q72 10 78 8Q84 10 86 25"/><path class="f" d="M12 106Q14 66 31 50Q29 26 47 13Q65 26 63 50Q80 66 82 106Z"/><path class="sh" d="M47 13Q65 26 63 50Q80 66 82 106H47Z"/><path class="d" d="M36 52Q36 30 47 25Q58 30 58 52Q47 58 36 52Z"/><circle class="a" cx="43" cy="42" r="2"/><circle class="a" cx="51" cy="42" r="2"/><path class="ln" d="M47 58V106M29 76Q47 82 65 76"/>` },
    archdemon: { label: "Archdemon: a great dragon with spread wings (the Archdemon, a high dragon)", svg: `<path class="f" d="M50 46Q34 28 4 22Q14 30 12 36Q4 36-2 42Q10 44 12 50Q4 52 0 60Q14 58 22 62Q30 58 40 64Z"/><path class="f" d="M50 46Q66 28 96 22Q86 30 88 36Q96 36 102 42Q90 44 88 50Q96 52 100 60Q86 58 78 62Q70 58 60 64Z"/><path class="sh" d="M50 46Q66 28 96 22Q86 30 88 36Q96 36 102 42Q90 44 88 50Q96 52 100 60Q86 58 78 62Q70 58 60 64Z"/><path class="ln" d="M50 46L12 36M50 46L12 50M50 46L22 62M50 46L88 36M50 46L88 50M50 46L78 62"/><path class="f" d="M42 58Q50 40 58 58Q60 78 54 92Q50 104 46 92Q40 78 42 58Z"/><path class="sh" d="M50 46Q58 52 58 58Q60 78 54 92Q50 104 50 98Z"/><path class="f" d="M46 52Q44 38 48 29L45 19L51 25L57 19L56 30Q58 39 54 52Z"/><circle class="a" cx="49" cy="30" r="1.6"/><circle class="a" cx="54" cy="30" r="1.6"/><path class="ln" d="M44 66Q50 70 56 66M43 74Q50 78 57 74M45 82Q50 85 55 82"/>` },
    golem: { label: "Golem: stone constructs, Shale, the Anvil's creations", svg: `<rect class="f" x="36" y="16" width="28" height="22" rx="4"/><rect class="f" x="28" y="38" width="44" height="34" rx="6"/><rect class="f" x="16" y="40" width="12" height="32" rx="5"/><rect class="f" x="72" y="40" width="12" height="32" rx="5"/><rect class="f" x="32" y="72" width="14" height="14" rx="3"/><rect class="f" x="54" y="72" width="14" height="14" rx="3"/><circle class="a" cx="44" cy="27" r="2.5"/><circle class="a" cx="56" cy="27" r="2.5"/><path class="a" d="M50 46L56 55L50 64L44 55Z"/>` },
  };

  // Overlays that tell the outcome. "under" marks are drawn behind the motif.
  const MARKS = {
    none: { label: "No overlay", svg: "" },
    crowned: { label: "Small crown above: became ruler, crowned, in charge", svg: `<g transform="translate(35 -1) scale(.3)">${CROWN}</g>` },
    dead: { label: "Skull badge (and greyed art if tone is 'dead'): died, killed, executed", svg: `<g transform="translate(66 64) scale(.3)"><circle class="badge" cx="50" cy="50" r="46"/><path class="f" d="M30 50Q30 22 50 22Q70 22 70 50Q70 58 64 62L64 74L36 74L36 62Q30 58 30 50Z"/><circle class="d" cx="41" cy="48" r="6"/><circle class="d" cx="59" cy="48" r="6"/></g>` },
    chained: { label: "Chain across: captured, imprisoned, enslaved, bound", svg: `<g class="k2" fill="none"><ellipse cx="22" cy="78" rx="10" ry="5.5" transform="rotate(-40 22 78)"/><ellipse cx="36" cy="66" rx="5.5" ry="10" transform="rotate(-40 36 66)"/><ellipse cx="50" cy="54" rx="10" ry="5.5" transform="rotate(-40 50 54)"/><ellipse cx="64" cy="42" rx="5.5" ry="10" transform="rotate(-40 64 42)"/><ellipse cx="78" cy="30" rx="10" ry="5.5" transform="rotate(-40 78 30)"/></g>` },
    freed: { label: "Broken chain: freed, escaped, released, spared", svg: `<g class="k2" fill="none"><ellipse cx="24" cy="76" rx="10" ry="5.5" transform="rotate(-40 24 76)"/><ellipse cx="38" cy="64" rx="5.5" ry="10" transform="rotate(-40 38 64)"/><path d="M47 60Q52 52 46 49"/><path d="M58 47Q52 46 54 40"/><ellipse cx="66" cy="38" rx="5.5" ry="10" transform="rotate(-40 66 38)"/><ellipse cx="80" cy="26" rx="10" ry="5.5" transform="rotate(-40 80 26)"/></g>` },
    broken: { label: "Crack through: destroyed, broken, failed, ruined, disbanded", svg: `<path class="crack" d="M60 8L46 34L60 46L42 72L54 92"/>` },
    burning: { label: "Flames below: burned, set alight, purged by fire", svg: `<path class="fire" d="M14 92Q18 74 26 82Q26 66 36 74Q38 58 48 70Q52 54 60 70Q66 60 68 76Q76 66 78 82Q84 74 88 92Z"/>` },
    bloodied: { label: "Blood drips from the top: blood magic, slaughter, a massacre", svg: `<path class="blood" d="M10 0H90V6Q86 6 86 14Q86 20 82 20Q78 20 78 12V6H62V22Q62 30 57 30Q52 30 52 22V6H36V16Q36 22 32 22Q28 22 28 16V6H18V10Q18 15 14 15Q10 15 10 10Z"/>` },
    slashed: { label: "Red X: refused, rejected, opposed, never happened", svg: `<path class="slash" d="M18 18L82 82M82 18L18 82"/>` },
    radiant: { label: "Light rays behind: honoured, saved, triumphant, blessed", under: true, svg: () => `<path class="rays" d="${ray(16, 30, 49)}"/>` },
    unknown: { label: "Question badge: not encountered, unresolved, unknown", svg: `<g transform="translate(66 64) scale(.3)"><circle class="badge" cx="50" cy="50" r="46"/><text x="50" y="72" text-anchor="middle" class="q">?</text></g>` },
    allied: { label: "Linked rings badge: allied, joined, recruited, sided with", svg: `<g transform="translate(64 62) scale(.33)"><circle class="badge" cx="50" cy="50" r="46"/><circle class="k" fill="none" cx="40" cy="50" r="16"/><circle class="k" fill="none" cx="60" cy="50" r="16"/></g>` },
    exiled: { label: "Arrow leaving: left, exiled, fled, went away, disappeared", svg: `<path class="arrow" d="M58 80H86M78 72L88 80L78 88"/>` },
    pierced: { label: "Sword through: slain in battle, defeated by force", svg: `<g transform="rotate(42 50 50) translate(0 -6) scale(1.05)"><path class="f" d="M47.5 2L52.5 2L52.5 70L50 76L47.5 70Z"/><rect class="f" x="38" y="68" width="24" height="5" rx="2"/></g>` },
    loved: { label: "Heart badge: romanced, beloved, married, devoted", svg: `<g transform="translate(66 64) scale(.3)"><circle class="badge" cx="50" cy="50" r="46"/><path class="a" d="M50 78L28 56Q20 46 26 38Q34 30 44 36L50 42L56 36Q66 30 74 38Q80 46 72 56Z"/></g>` },
    starred: { label: "Star badge: a special outcome, heroic deed, best ending", svg: () => `<g transform="translate(66 64) scale(.3)"><circle class="badge" cx="50" cy="50" r="46"/><path class="a" d="${starPath(50, 52, 34, 14)}"/></g>` },
    gold: { label: "Coin badge: paid, sold, bribed, rewarded", svg: `<g transform="translate(66 64) scale(.3)"><circle class="badge" cx="50" cy="50" r="46"/><circle class="a" cx="50" cy="50" r="24"/><path class="d" d="M50 36L57 50L50 64L43 50Z"/></g>` },
    corrupted: { label: "Red lyrium shards: corrupted, tainted, possessed, twisted", svg: `<path class="taint" d="M14 92L22 62L28 92ZM74 92L80 58L88 92ZM30 92L34 74L39 92Z"/>` },
  };

  function resolve(v) {
    return typeof v === "function" ? v() : v;
  }

  function svgFor(spec, game, w = 1, h = 1) {
    const motif = MOTIFS[spec && spec.motif] || MOTIFS.figure;
    const mark = MARKS[(spec && spec.mark) || "none"] || MARKS.none;
    const tone = TONES[(spec && spec.tone) || "neutral"] || TONES.neutral;
    const p = tone(PALETTES[game] || PALETTES.dao);

    const W = 100 * w, H = 100 * h;
    const m = Math.min(W, H);
    const size = m * 0.94;
    const tx = (W - size) / 2;
    const ty = (H - size) / 2 + m * 0.01;
    const glow = p.glow || p.acc;

    // Deterministic per-emblem randomness so each answer's tile always looks the same.
    const seedStr = JSON.stringify([spec, game]);
    let seed = 2166136261;
    for (let i = 0; i < seedStr.length; i++) seed = Math.imul(seed ^ seedStr.charCodeAt(i), 16777619);
    const rand = () => ((seed = Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) >>> 0) / 4294967296;
    const id = "e" + (seed >>> 0).toString(36);
    const nseed = Math.floor(rand() * 900) + 1;

    // Light beams fanning out from behind the subject.
    const fx = W / 2, fy = ty + size * 0.36;
    const R = Math.max(W, H) * 1.6;
    const nb = 18;
    const turn = rand() * Math.PI;
    let beams = "";
    for (let i = 0; i < nb; i += 2) {
      const a1 = turn + (i / nb) * Math.PI * 2, a2 = turn + ((i + 1) / nb) * Math.PI * 2;
      beams += `M${fx} ${fy}L${(fx + Math.cos(a1) * R).toFixed(1)} ${(fy + Math.sin(a1) * R).toFixed(1)}L${(fx + Math.cos(a2) * R).toFixed(1)} ${(fy + Math.sin(a2) * R).toFixed(1)}Z`;
    }

    // Faint swirling scratches, like brush or tool marks in the paint.
    let scratches = "";
    for (let i = 0; i < 9; i++) {
      const cx = rand() * W, cy = rand() * H, r = (0.25 + rand() * 0.6) * m;
      const a = rand() * Math.PI * 2, b = a + 0.6 + rand() * 1.4;
      scratches += `M${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + Math.cos(b) * r).toFixed(1)} ${(cy + Math.sin(b) * r).toFixed(1)}`;
    }

    const lit = p.fg, shade = mix(p.fg, p.bg1, 0.55), accDark = mix(p.acc, p.bg2, 0.45);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="${id}g" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="${p.bg1}"/><stop offset=".55" stop-color="${mix(p.bg1, p.bg2, 0.55)}"/><stop offset="1" stop-color="${p.bg2}"/></radialGradient>
<radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset=".6" stop-color="${glow}" stop-opacity=".18"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}v" cx="50%" cy="45%" r="72%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></radialGradient>
<linearGradient id="${id}f" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${lit}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
<linearGradient id="${id}a" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${mix(p.acc, "#ffffff", 0.25)}"/><stop offset="1" stop-color="${accDark}"/></linearGradient>
<filter id="${id}p" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="${(0.9 / m * 2.2).toFixed(4)}" numOctaves="4" seed="${nseed}" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.5 -.45"/>
</filter>
<filter id="${id}n" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="${(140 / m).toFixed(3)}" numOctaves="2" seed="${nseed + 7}"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 -.22"/>
</filter>
<filter id="${id}w" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${nseed + 3}" result="gr"/>
<feColorMatrix in="gr" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .9 -.3" result="grain"/>
<feComposite in="grain" in2="SourceGraphic" operator="in" result="grainIn"/>
<feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="4" seed="${nseed + 5}" result="bl"/>
<feColorMatrix in="bl" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.2 -.38" result="blot"/>
<feComposite in="blot" in2="SourceGraphic" operator="in" result="blotIn"/>
<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="blotIn"/><feMergeNode in="grainIn"/></feMerge>
</filter>
<filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#000" flood-opacity=".7"/></filter>
<style>
.f{fill:url(#${id}f);stroke:${p.ink};stroke-width:2.2;stroke-linejoin:round}
.d{fill:${p.ink};stroke:${p.ink};stroke-width:1}
.a{fill:url(#${id}a);stroke:${p.ink};stroke-width:1.6;stroke-linejoin:round}
.sh{fill:${p.ink};fill-opacity:.38;stroke:none}
.ln{fill:none;stroke:${p.acc};stroke-opacity:.75;stroke-width:1.5;stroke-linecap:round}
.glow{fill:url(#${id}h)}
.s{stroke:${p.ink};stroke-width:2.2;stroke-linecap:round}
.k{stroke:${p.fg};stroke-width:6;stroke-linecap:round;fill:none}
.k2{stroke:${p.acc};stroke-width:4;stroke-linecap:round}
.h{fill:#fff;fill-opacity:.35;stroke:#fff;stroke-opacity:.45;stroke-width:2}
.badge{fill:${p.bg2};stroke:${p.acc};stroke-width:5}
.q{font:700 64px Georgia,serif;fill:${p.acc}}
.crack{fill:none;stroke:${p.bg2};stroke-width:6;stroke-linejoin:bevel}
.fire{fill:#e0702a;stroke:#5a1a06;stroke-width:2;opacity:.92}
.blood{fill:#8e1010;stroke:#3a0303;stroke-width:1.2}
.slash{stroke:#c0392b;stroke-width:7;stroke-linecap:round;opacity:.9}
.rays{stroke:${glow};stroke-width:3;stroke-linecap:round;opacity:.55}
.arrow{fill:none;stroke:${p.acc};stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.taint{fill:#c4242e;stroke:#3a0508;stroke-width:1.5}
</style>
</defs>
<rect width="${W}" height="${H}" fill="url(#${id}g)"/>
<path d="${beams}" fill="${glow}" fill-opacity=".09"/>
<circle cx="${fx}" cy="${fy}" r="${(size * 0.42).toFixed(1)}" fill="url(#${id}h)"/>
<path d="${scratches}" fill="none" stroke="${p.fg}" stroke-opacity=".07" stroke-width="${(m / 140).toFixed(2)}"/>
<rect width="${W}" height="${H}" filter="url(#${id}p)"/>
<g filter="url(#${id}s)"><g filter="url(#${id}w)" transform="translate(${tx} ${ty}) scale(${size / 100})">
${mark.under ? resolve(mark.svg) : ""}${resolve(motif.svg)}${mark.under ? "" : resolve(mark.svg)}
</g></g>
<rect width="${W}" height="${H}" filter="url(#${id}n)" opacity=".5"/>
<rect width="${W}" height="${H}" fill="url(#${id}v)"/>
</svg>`;
  }

  const cache = new Map();
  function url(spec, game, w, h) {
    const key = JSON.stringify([spec, game, w, h]);
    if (!cache.has(key)) cache.set(key, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFor(spec, game, w, h).replace(/\s*\n\s*/g, "")));
    return cache.get(key);
  }

  root.Emblems = {
    motifs: Object.fromEntries(Object.entries(MOTIFS).map(([k, v]) => [k, v.label])),
    marks: Object.fromEntries(Object.entries(MARKS).map(([k, v]) => [k, v.label])),
    tones: Object.keys(TONES),
    svg: svgFor,
    url,
  };
})(typeof window !== "undefined" ? window : globalThis);
