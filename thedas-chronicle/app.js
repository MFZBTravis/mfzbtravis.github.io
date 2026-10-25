/* Thedas Chronicle: record Dragon Age world-state choices and export them as JSON.
 *
 * Data: window.CHRONICLE (built by tools/build_public.py)
 *   games    - [{id, label, hero, sections: [sectionId], heroFlags: [flagId]}]
 *   sections - {id: {title, game, flags: [flagId]}}
 *   flags    - {id: {game, section, question, context, canon, min, max, imported,
 *                    answers: [{value, label, description, emblem}], rules}}
 * Art: window.ART (data/art-manifest.js, built by tools/keep_art.py) maps picture ids to images: "<flag>-<value>"
 *      for answers (Dragon Age Keep illustrations, or the game's heraldry), plus hero-<game>.
 *      Anything without an image falls back to window.Emblems (emblems.js) SVG.
 *
 * Rules: value V of flag F is allowed if no rule of F mentions V, or at least
 * one of F's rules for V has every dependency [flag, min, max] satisfied.
 */
(function () {
  "use strict";

  const C = window.CHRONICLE;
  const E = window.Emblems;
  const ART = window.ART || {};
  const STORAGE_KEY = "thedasChronicle.v1";
  const FORMAT = "dragon-age-keep-worldstate";
  const PLUGIN_URL = "https://github.com/MFZBTravis/ThedasChronicle/releases/latest";
  const REPO_URL = "https://github.com/MFZBTravis/ThedasChronicle";
  const ASI_LOADER_URL = "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases";

  const flagIds = Object.keys(C.flags);
  const gameOf = (id) => C.games.find((g) => g.id === id);

  // ---------------------------------------------------------------- state --

  const canonState = () => Object.fromEntries(flagIds.map((f) => [f, C.flags[f].canon]));
  // Heroes' first names: flavour only (Inquisition never reads them), kept in the export as "heroNames".
  const HERO_NAMES = {
    dao: { key: "warden", label: "The Warden's first name", example: "Lyna" },
    da2: { key: "hawke", label: "Hawke's first name", example: "Marian" },
    dai: { key: "inquisitor", label: "The Inquisitor's first name", example: "Ellana" },
  };
  let state = { name: "", answers: canonState(), heroNames: {} };

  function takeHeroNames(src) {
    const out = {};
    for (const { key } of Object.values(HERO_NAMES))
      if (src && typeof src[key] === "string" && src[key].trim()) out[key] = src[key].trim().slice(0, 40);
    return out;
  }
  const heroName = (game) => (HERO_NAMES[game] ? state.heroNames[HERO_NAMES[game].key] || "" : "");
  // The Warden's surname comes with their origin (dao_warden_background), the Inquisitor's with their race
  // (dai_inquisitor_race); Hawke's is always Hawke.
  const WARDEN_SURNAMES = ["Cousland", "Amell", "Mahariel", "Tabris", "Surana", "Aeducan", "Brosca"];
  const INQUISITOR_SURNAMES = ["Trevelyan", "Lavellan", "Cadash", "Adaar"];
  const surname = (game) =>
    game === "da2"
      ? "Hawke"
      : (game === "dao" ? WARDEN_SURNAMES[state.answers.dao_warden_background] : INQUISITOR_SURNAMES[state.answers.dai_inquisitor_race]) || "";

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      state.name = typeof saved.name === "string" ? saved.name : "";
      state.heroNames = takeHeroNames(saved.heroNames);
      for (const [f, v] of Object.entries(saved.answers || {})) if (f in C.flags && Number.isInteger(v)) state.answers[f] = v;
    } catch (e) {
      /* storage unavailable; start from canon */
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  // ------------------------------------------------------------- helpers --

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const answerOf = (f, v) => C.flags[f].answers.find((a) => a.value === v);
  const label = (f, v) => answerOf(f, v)?.label || `Option ${v}`;

  function art(f, v, w = 1, h = 1) {
    if (ART[`${f}-${v}`]) return ART[`${f}-${v}`];
    const a = answerOf(f, v);
    return E.url(a ? a.emblem : { motif: "figure" }, C.flags[f].game, w, h);
  }
  // Goes inside a double-quoted style="" attribute.
  // Heraldry (SVG) sits centred on its own field; illustrations fill the tile.
  // Hawke's field is the Dragon Age II splash screen's parchment; the Inquisitor's is black.
  const FIELD = {
    "hawke.svg": "radial-gradient(circle at 50% 40%, #f7f3ea, #ece7dc 55%, #e1d9cd)",
    "inquisition.svg": "#000",
  };
  const field = (url) => FIELD[url.split("/").pop().split("?")[0]] || "#141b2e";
  const bg = (url) =>
    /\.svg$/.test(url)
      ? `background:url('${url}') center 38% / auto 62% no-repeat, ${field(url)}`
      : `background-image:url('${url}')`;

  function where(f) {
    const F = C.flags[f];
    return [gameOf(F.game)?.label, F.section ? C.sections[F.section].title : "Hero"].filter(Boolean).join(" › ");
  }

  const changed = (flags) => flags.filter((f) => state.answers[f] !== C.flags[f].canon).length;
  const gameFlags = (g) => flagIds.filter((f) => C.flags[f].game === g);

  // --------------------------------------------------------------- rules --

  function valid(flag, value, answers) {
    const rules = C.flags[flag].rules.filter((r) => r.value === value);
    if (!rules.length) return true;
    return rules.some((r) => r.when.every(([q, lo, hi]) => answers[q] >= lo && answers[q] <= hi));
  }

  const invalidFlags = (answers) => flagIds.filter((f) => !valid(f, answers[f], answers));

  function range(flag) {
    const out = [];
    for (let v = C.flags[flag].min; v <= C.flags[flag].max; v++) out.push(v);
    return out;
  }

  /* What else must change if `flag` becomes `value`: satisfy the new value's own
   * rules (fewest changes, preferring canon), then the rules of every answer that
   * changed for it, and so on down the chain (romancing Sera makes her a true friend,
   * which means she stayed to the end). Then repeatedly re-pick answers that became
   * invalid (canon first, then the lowest valid value). Answers that were already
   * inconsistent before the change are left alone. */
  function propose(flag, value) {
    const before = state.answers;
    const preInvalid = new Set(invalidFlags(before));
    const next = { ...before, [flag]: value };
    const pinned = new Set([flag]);

    const queue = [flag];
    for (let steps = 0; queue.length && steps < 200; steps++) {
      const f = queue.shift();
      if (valid(f, next[f], next)) continue;
      let best = null;
      for (const r of C.flags[f].rules.filter((r) => r.value === next[f])) {
        const unmet = r.when.filter(([q, lo, hi]) => !(next[q] >= lo && next[q] <= hi));
        if (unmet.some(([q]) => pinned.has(q))) continue;  // would undo an answer already decided
        if (!best || unmet.length < best.length) best = unmet;
      }
      for (const [q, lo, hi] of best || []) {
        const c = C.flags[q].canon;
        next[q] = c >= lo && c <= hi ? c : lo;
        pinned.add(q);
        queue.push(q);
      }
    }

    for (let iter = 0; iter < 50; iter++) {
      const bad = flagIds.filter((f) => !pinned.has(f) && !preInvalid.has(f) && !valid(f, next[f], next));
      if (!bad.length) break;
      let progressed = false;
      for (const f of bad) {
        const v = [C.flags[f].canon, ...range(f)].find((c) => valid(f, c, next));
        if (v !== undefined && v !== next[f]) {
          next[f] = v;
          progressed = true;
        }
      }
      if (!progressed) break;
    }

    return {
      next,
      changes: flagIds.filter((f) => f !== flag && next[f] !== before[f]),
      unresolved: flagIds.filter((f) => !preInvalid.has(f) && !valid(f, next[f], next)),
    };
  }

  function commit(answers) {
    state.answers = answers;
    save();
    renderView();
  }

  function choose(flag, value) {
    if (state.answers[flag] === value) return;
    const p = propose(flag, value);
    if (!p.changes.length && !p.unresolved.length) {
      commit(p.next);
      return reopen();
    }
    openSolver(flag, value, p);
  }

  // ------------------------------------------------------------- routing --

  function route() {
    const [game, section] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    return {
      game: gameOf(game) ? game : null,
      section: section && C.sections[section] && C.sections[section].game === game ? section : null,
    };
  }
  const go = (game, section) => (location.hash = "#/" + (game || "") + (section ? "/" + section : ""));

  // ------------------------------------------------------------- render --

  function badges(f) {
    const out = [];
    if (state.answers[f] !== C.flags[f].canon) out.push('<span class="badge changed">Changed</span>');
    if (!valid(f, state.answers[f], state.answers)) out.push('<span class="badge conflict">Conflict</span>');
    return out.length ? `<div class="badges">${out.join("")}</div>` : "";
  }

  function renderGames(current) {
    $("games").innerHTML = C.games
      .map((g) => {
        const n = changed(gameFlags(g.id));
        return `<button data-game="${g.id}" aria-current="${g.id === current}">${esc(g.label)}${n ? `<span class="count">${n}</span>` : ""}</button>`;
      })
      .join("");
  }

  function renderCrumbs(game, section) {
    if (!game) return void ($("crumbs").innerHTML = "");
    const g = gameOf(game);
    $("crumbs").innerHTML = section
      ? `<a data-go="${game}">${esc(g.label)}</a><span class="sep">›</span>${esc(C.sections[section].title)}`
      : esc(g.label);
  }

  function heroSummary(game) {
    const parts = gameOf(game)
      .heroFlags.filter((f) => /_(mf|background|race|class)$/.test(f))
      .map((f) => label(f, state.answers[f]));
    const name = heroName(game);
    if (name) parts.unshift(`${name} ${surname(game)}`.trim());
    return parts.join(" · ");
  }

  const FULL_TITLE = { dao: "Dragon Age: Origins", da2: "Dragon Age II", dai: "Dragon Age: Inquisition" };

  function renderHome() {
    $("view").innerHTML = `<div class="intro">
        <p>Record the choices from your Dragon Age playthroughs (who lived, who ruled, who you loved) and export them as a single JSON file.</p>
        <p>Pick a game to begin. Every question starts at a sensible default; change only what differs in your story.</p>
        <p><button class="btn primary" data-action="guide">Use it in Dragon Age: Inquisition</button></p>
      </div>
      <div class="home">${C.games
        .map((g) => {
          const flags = gameFlags(g.id);
          return `<button class="home-card" data-game="${g.id}">
            <h3>${esc(FULL_TITLE[g.id] || g.label)}</h3>
            <p>${flags.length} choices · ${changed(flags)} changed</p></button>`;
        })
        .join("")}</div>`;
  }

  function renderGame(game) {
    const g = gameOf(game);
    const flags = gameFlags(game);
    const heroArt = ART[`hero-${game}`] || E.url({ motif: "figure", mark: "radiant", tone: "good" }, game, 4 / 3, 1);
    const cards = g.sections
      .map((sid) => {
        const s = C.sections[sid];
        const lead = s.flags[0];
        const n = changed(s.flags);
        const conflicts = s.flags.filter((f) => !valid(f, state.answers[f], state.answers)).length;
        const b = [];
        if (n) b.push(`<span class="badge changed">${n} changed</span>`);
        if (conflicts) b.push(`<span class="badge conflict">${conflicts} conflict${conflicts > 1 ? "s" : ""}</span>`);
        return `<button class="tile" data-game="${game}" data-section="${sid}" style="${bg(art(lead, state.answers[lead], 4 / 3, 1))}">
          ${b.length ? `<div class="badges">${b.join("")}</div>` : ""}
          <div class="plate"><h4>${esc(s.title)}</h4><div class="question">${s.flags.length} choice${s.flags.length > 1 ? "s" : ""}</div></div></button>`;
      })
      .join("");
    const imported = flags.filter((f) => C.flags[f].imported).length;
    $("view").innerHTML = `<div class="view-title"><h2>${esc(g.label)}</h2><span class="sub">${flags.length} choices · ${changed(flags)} changed from default</span></div>
      <div class="grid sections">
        <button class="tile" data-hero="${game}" style="${bg(heroArt)}"><div class="plate"><h4>${esc(g.hero)}</h4>
          <div class="question">${esc(heroSummary(game))}</div></div></button>
        ${cards}
      </div>
      <div class="legend">${
        game === "dai"
          ? "Inquisition choices are included for completeness; Inquisition itself only reads Origins and Dragon Age II choices."
          : `${imported} of these choices are read by Dragon Age: Inquisition when a new game starts.`
      }</div>`;
  }

  function renderSection(game, sid) {
    const s = C.sections[sid];
    $("view").innerHTML = `<div class="view-title"><h2>${esc(s.title)}</h2><span class="sub">${s.flags.length} choice${
      s.flags.length > 1 ? "s" : ""
    } · ${changed(s.flags)} changed from default</span></div>
      <div class="grid">${s.flags
        .map((f) => {
          const v = state.answers[f];
          return `<button class="tile" data-flag="${f}" style="${bg(art(f, v))}">${badges(f)}
            <div class="plate"><div class="answer">${esc(label(f, v))}</div><div class="question">${esc(C.flags[f].question)}</div></div></button>`;
        })
        .join("")}</div>`;
  }

  function renderSearch(q) {
    renderGames(null);
    $("crumbs").textContent = "Search";
    const hits = flagIds.filter((f) => {
      const F = C.flags[f];
      return (F.question + " " + F.context + " " + F.answers.map((a) => a.label + " " + a.description).join(" ")).toLowerCase().includes(q);
    });
    $("view").innerHTML = hits.length
      ? `<div class="results">${hits
          .map(
            (f) => `<button class="result" data-flag="${f}"><div class="thumb" style="${bg(art(f, state.answers[f]))}"></div>
              <div><div class="where">${esc(where(f))}</div><div class="q">${esc(C.flags[f].question)}</div>
              <div class="a">${esc(label(f, state.answers[f]))}</div></div></button>`
          )
          .join("")}</div>`
      : `<p>No choices match “${esc(q)}”.</p>`;
  }

  function renderView() {
    $("ws-name").value = state.name;
    const q = $("search").value.trim().toLowerCase();
    if (q) return renderSearch(q);
    const { game, section } = route();
    renderGames(game);
    renderCrumbs(game, section);
    if (!game) renderHome();
    else if (section) renderSection(game, section);
    else renderGame(game);
  }

  // -------------------------------------------------------------- modals --

  let modalCtx = null; // {kind: "question", flag} | {kind: "hero", game} | {kind: "about" | "guide"}, plus `solver`

  function openModal(html, ctx) {
    $("modal-body").innerHTML = html;
    $("modal").hidden = false;
    modalCtx = ctx;
  }

  function closeModal() {
    $("modal").hidden = true;
    $("modal-body").innerHTML = "";
    modalCtx = null;
  }

  function reopen() {
    if (!modalCtx) return;
    if (modalCtx.kind === "hero") openHero(modalCtx.game);
    else if (modalCtx.kind === "question") openQuestion(modalCtx.flag);
  }

  function openQuestion(flag) {
    const F = C.flags[flag];
    const cur = state.answers[flag];
    const meta = [];
    if (F.imported) meta.push('<span class="badge game">Read by Inquisition</span>');
    if (cur !== F.canon) meta.push('<span class="badge changed">Changed from default</span>');
    const cards = F.answers
      .map((a) => {
        const ok = valid(flag, a.value, state.answers);
        const tags = [];
        if (a.value === F.canon) tags.push('<span class="badge">Default</span>');
        if (!ok) tags.push('<span class="badge conflict">Changes other choices</span>');
        return `<button class="answer-card${a.value === cur ? " selected" : ""}${ok ? "" : " invalid"}" data-flag="${flag}" data-value="${a.value}">
          <div class="img" style="${bg(art(flag, a.value, 1.6, 1))}"></div>
          <div class="body"><div class="title">${esc(a.label)}</div><div class="desc">${esc(a.description)}</div>
          ${tags.length ? `<div class="foot">${tags.join("")}</div>` : ""}</div></button>`;
      })
      .join("");
    openModal(
      `<div class="q-head">${esc(where(flag))}</div>
      <h2 class="q-title" id="modal-title">${esc(F.question)}</h2>
      ${F.context ? `<p class="q-context">${esc(F.context)}</p>` : ""}
      ${meta.length ? `<div class="q-meta">${meta.join("")}</div>` : ""}
      <div class="answers">${cards}</div>`,
      { kind: "question", flag }
    );
  }

  function openHero(game) {
    const g = gameOf(game);
    const rows = g.heroFlags
      .filter((f) => C.flags[f])
      .map((f) => {
        const F = C.flags[f];
        const opts = range(f)
          .map((v) => {
            const ok = valid(f, v, state.answers);
            return `<button class="opt${state.answers[f] === v ? " selected" : ""}${ok ? "" : " invalid"}" data-flag="${f}" data-value="${v}" title="${esc(
              answerOf(f, v)?.description || ""
            )}">${esc(label(f, v))}</button>`;
          })
          .join("");
        return `<div class="choice-row"><h3>${esc(F.question)}${F.imported ? ' <span class="badge game">Read by Inquisition</span>' : ""}</h3>
          ${F.context ? `<p class="q-context">${esc(F.context)}</p>` : ""}<div class="opts">${opts}</div></div>`;
      })
      .join("");
    const named = HERO_NAMES[game];
    const nameRow = named
      ? `<div class="choice-row"><h3>${esc(named.label)}</h3>
          <p class="q-context">Just for your own record: ${
            game === "dai" ? "the game doesn't read it." : "Inquisition never uses it."
          } It's saved in your exported file.</p>
          <div class="hero-name-row"><input class="hero-name" type="text" maxlength="40" data-hero-name="${named.key}" value="${esc(heroName(game))}"
            placeholder="e.g. ${esc(named.example)}" aria-label="${esc(named.label)}">
            <span class="surname">${esc(surname(game))}</span></div></div>`
      : "";
    openModal(`<div class="q-head">${esc(g.label)} › Hero</div><h2 class="q-title" id="modal-title">${esc(g.hero)}</h2>${nameRow}${rows}`, {
      kind: "hero",
      game,
    });
  }

  function openSolver(flag, value, p) {
    const row = (f, cls = "") => `<div class="change${cls}">
      <div><div class="q">${esc(C.flags[f].question)}</div>
      <div><span class="from">${esc(label(f, state.answers[f]))}</span> → <span class="to">${esc(label(f, p.next[f]))}</span></div></div>
      <div class="imgs"><span style="${bg(art(f, state.answers[f]))}"></span><i>→</i><span style="${bg(art(f, p.next[f]))}"></span></div></div>`;
    const unresolved = p.unresolved.filter((f) => !p.changes.includes(f) && f !== flag);
    const ctx = { ...(modalCtx || { kind: "question", flag }), solver: p };
    openModal(
      `<div class="solver"><h2 id="modal-title">Other choices need to change</h2>
      <p>Choosing “${esc(label(flag, value))}” for “${esc(C.flags[flag].question)}” doesn't fit with ${p.changes.length} other choice${
        p.changes.length === 1 ? "" : "s"
      }. To keep the story consistent:</p>
      <div class="changes">${p.changes.map((f) => row(f)).join("")}${unresolved.map((f) => row(f, " unresolved")).join("")}</div>
      ${unresolved.length ? `<p>${unresolved.length} choice(s) couldn't be made consistent automatically and will be marked as conflicts.</p>` : ""}
      <div class="modal-actions"><button class="btn" data-action="cancel">Cancel</button><button class="btn primary" data-action="apply">Make changes</button></div></div>`,
      ctx
    );
  }

  function openGuide() {
    openModal(
      `<div class="about guide"><h2 class="q-title" id="modal-title">Use it in Dragon Age: Inquisition</h2>
      <p>EA's Dragon Age Keep no longer works, so Inquisition can't import a world state from it. The free Thedas Chronicle
      plugin fixes that: when the game asks the Keep for your world state, it gets the file you export here instead.</p>
      <ol>
        <li><b>Install the Ultimate ASI Loader.</b> Download the x64 version from its
          <a href="${ASI_LOADER_URL}" target="_blank" rel="noopener">releases page</a> and put its <code>dinput8.dll</code>
          in the game folder, next to <code>DragonAgeInquisition.exe</code>.</li>
        <li><b>Install the plugin.</b> Download the latest <code>ThedasChronicle</code> zip from the
          <a href="${PLUGIN_URL}" target="_blank" rel="noopener">plugin's releases</a> and copy its <code>scripts</code> folder
          into the game folder.</li>
        <li><b>Export your world state.</b> Record your choices on this site, give your world state a name, and press
          <b>Export JSON</b>. Put the downloaded <code>world-state.json</code> in the game folder, next to
          <code>DragonAgeInquisition.exe</code>.</li>
        <li><b>Start a new game.</b> At character creation, choose to import a world state from the Keep. The game shows your
          custom world state and its "import successful" message.</li>
      </ol>
      <p>The game folder is usually <code>C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dragon Age Inquisition</code>
      (Steam) or <code>C:\\Program Files\\EA Games\\Dragon Age Inquisition</code> (EA app).
      To change your world state, export a new file, replace the old one and start a new game.</p>
      <p>The plugin also stands in for EA's servers, so the game never waits on them, and makes the golden nug unlock
      everything it can sync. To have the golden nug unlock only what you've synced in your own playthroughs, like the
      original Keep, set <code>Mode=earned</code> in <code>scripts\\ThedasChronicleHook.ini</code>.
      If something doesn't work, check <code>scripts\\ThedasChronicleHook.log</code> in the game folder.
      Works with the Steam and EA app versions of Dragon Age: Inquisition on PC.
      Source code and full instructions: <a href="${REPO_URL}" target="_blank" rel="noopener">github.com/MFZBTravis/ThedasChronicle</a>.</p></div>`,
      { kind: "guide" }
    );
  }

  function openAbout() {
    openModal(
      `<div class="about"><h2 class="q-title" id="modal-title">About Thedas Chronicle</h2>
      <p>A fan-made way to record what happened in your Dragon Age: Origins, Dragon Age II and Inquisition playthroughs. Choices are checked against each other so the story stays consistent, and your progress is saved in this browser.</p>
      <p><b>Export JSON</b> saves a file with every choice as <code>flag name → value</code>. The flag names match the ones Dragon Age: Inquisition uses for its world state. With the free <a href="${REPO_URL}" target="_blank" rel="noopener">Thedas Chronicle plugin</a> the game imports this file in place of the Dragon Age Keep: see <a href="#" data-action="guide">Use it in Inquisition</a>.</p>
      <p>This is an unofficial, non-commercial fan project. This website is not endorsed by or affiliated with EA or its licensors. The illustrations come from BioWare's Dragon Age Keep and the heraldry from the Dragon Age games; they belong to Electronic Arts and BioWare and are used under EA's fan content policy. The question and answer text is original.</p></div>`,
      { kind: "about" }
    );
  }

  // ------------------------------------------------------- import/export --

  /* The flags Dragon Age: Inquisition itself reads when importing a world state: the Keep answers it uses
   * directly, plus flags EA's server used to derive from them (rules in data/derived-flags.json). */
  function inquisitionFlags(answers) {
    const ex = C.gameExport;
    const test = (c) =>
      c.all ? c.all.every(test) : c.any ? c.any.some(test) : c.in.includes(answers[c.from]);
    const out = {};
    for (const f of ex.direct) out[f] = answers[f];
    for (const [f, rule] of Object.entries(ex.rules)) {
      out[f] = rule.map ? rule.map[String(answers[rule.from])] : test(rule) ? 1 : 0;
    }
    return out;
  }

  function exportJson() {
    // The name is shown in Inquisition as the imported world state's name, so ask for one first.
    if (!state.name.trim()) {
      const field = $("ws-name");
      field.classList.add("needs-name");
      field.focus();
      return notice("Give your world state a name before exporting. Inquisition shows it when you import.", true);
    }
    const answers = Object.fromEntries(flagIds.map((f) => [f, state.answers[f]]));
    const doc = {
      format: FORMAT,
      version: 2,
      generator: "Thedas Chronicle",
      name: state.name.trim(),
      exported: new Date().toISOString(),
      ...(Object.keys(state.heroNames).length ? { heroNames: { ...state.heroNames } } : {}),
      answers,
      game: inquisitionFlags(answers),
    };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "world-state.json";  // the name the game plugin looks for; the world-state name is inside
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function importJson(text) {
    let doc;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      return notice("That file isn't valid JSON.", true);
    }
    const src = doc && typeof doc.answers === "object" ? doc.answers : doc;
    if (!src || typeof src !== "object") return notice("No choices found in that file.", true);
    const answers = canonState();
    let applied = 0;
    let skipped = 0;
    for (const [f, v] of Object.entries(src)) {
      const F = C.flags[f];
      if (!F || !Number.isInteger(v) || v < F.min || v > F.max) {
        skipped++;
        continue;
      }
      answers[f] = v;
      applied++;
    }
    if (typeof doc.name === "string") state.name = doc.name;
    state.heroNames = takeHeroNames(doc.heroNames);
    commit(answers);
    const conflicts = invalidFlags(answers).length;
    notice(
      `Imported ${applied} choices` +
        (skipped ? `, skipped ${skipped} unknown or out-of-range` : "") +
        (conflicts ? `. ${conflicts} choice(s) don't fit together and are marked as conflicts.` : ".")
    );
  }

  function notice(msg, isError) {
    const n = $("notice");
    n.className = "notice" + (isError ? " error" : "");
    n.innerHTML = `${esc(msg)}<button class="btn subtle" data-action="dismiss">Dismiss</button>`;
    n.hidden = false;
  }

  function toggleMenu(open) {
    const existing = document.querySelector(".menu");
    if (existing) existing.remove();
    if (!open) return;
    const m = document.createElement("div");
    m.className = "menu";
    m.innerHTML = `<button data-action="guide">Use in Inquisition</button><button data-action="reset">Reset all to defaults</button><button data-action="about">About</button>`;
    $("btn-more").parentElement.appendChild(m);
  }

  // -------------------------------------------------------------- events --

  document.addEventListener("click", (e) => {
    if (e.target.id !== "btn-more" && !e.target.closest(".menu")) toggleMenu(false);
    if (e.target === $("modal") || e.target.closest("#modal-close")) return closeModal();

    const el = e.target.closest("[data-game],[data-go],[data-section],[data-flag],[data-hero],[data-action]");
    if (!el) return;
    const action = el.dataset.action;

    if (action) {
      e.preventDefault();
      toggleMenu(false);
      if (action === "dismiss") return void ($("notice").hidden = true);
      if (action === "about") return openAbout();
      if (action === "guide") return openGuide();
      if (action === "reset") {
        if (confirm("Reset every choice to its default?")) {
          commit(canonState());
          notice("All choices reset to their defaults.");
        }
        return;
      }
      if (action === "apply") commit(modalCtx.solver.next);
      if (action === "apply" || action === "cancel") {
        delete modalCtx.solver;
        return reopen();
      }
      return;
    }

    if (el.dataset.value !== undefined) return choose(el.dataset.flag, Number(el.dataset.value));
    if (el.dataset.hero) return openHero(el.dataset.hero);
    if (el.dataset.section) return go(el.dataset.game, el.dataset.section);
    if (el.dataset.flag) return openQuestion(el.dataset.flag);
    if (el.dataset.go) return go(el.dataset.go);
    if (el.dataset.game) {
      $("search").value = "";
      return go(el.dataset.game);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleMenu(false);
      if (!$("modal").hidden) closeModal();
    }
  });

  $("btn-more").addEventListener("click", () => toggleMenu(!document.querySelector(".menu")));
  $("ws-name").addEventListener("input", (e) => {
    state.name = e.target.value;
    if (state.name.trim()) {
      e.target.classList.remove("needs-name");
      $("notice").hidden = true;
    }
    save();
  });
  document.addEventListener("input", (e) => {
    const key = e.target.dataset.heroName;
    if (!key) return;
    const v = e.target.value.trim();
    if (v) state.heroNames[key] = v;
    else delete state.heroNames[key];
    save();
    renderView();
  });
  $("search").addEventListener("input", renderView);
  $("btn-export").addEventListener("click", exportJson);
  $("btn-import").addEventListener("click", () => $("file-import").click());
  $("file-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) file.text().then(importJson);
    e.target.value = "";
  });
  window.addEventListener("hashchange", renderView);

  load();
  renderView();
})();
