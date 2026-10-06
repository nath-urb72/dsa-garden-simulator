// =====================================================================
// SEMANTIC VERSIONING (SemVer 2.0.0)
// Single source of truth. Do not hard-code the version elsewhere.
// MAJOR: breaking change (e.g. changing bridge function names/signatures that Python depends on)
// MINOR: new backward-compatible feature (e.g. finishing a new topic's code)
// PATCH: bug fix or small tweak with no new feature
// Use 0.x.y while in development; move to 1.0.0 once all 11 topics are complete.
// =====================================================================
const APP_VERSION = "1.1.0";

let pyodideInstance = null;
let gardenPlants = {};
// name -> emoji, filled by addPlantsToDropdown so tiles can draw each plant's own emoji.
let plantEmoji = {};

// Display-only list of action labels (populated by Python via pushAction). No JS game logic.
let displayActionHistory = [];

// =====================================================================
// TOPIC TEMPLATES — titles live here; the Python for each topic lives in
// garden-topics.py (one file, split by "# ===== TOPIC n =====" markers) and is
// loaded into the `code` fields by loadTopicCode() on startup.
// Call the bridge functions from your Python to update the UI.
// =====================================================================
const TOPICS_PY_URL = "garden-topics.py";
let topicLoadError = ""; // shown in the editor if the fetch fails (the output console gets overwritten by initPyodide)

const topicTemplates = {
  1: { title: "Python OOP + Big O + Stacks", code: "" },
  2: { title: "Queues & Deques (FIFO Elements)", code: "" },
  3: { title: "Static/Dynamic Arrays, 2D Lists, & Memory Structures", code: "" },
  4: { title: "Hierarchical Trees & Traversals", code: "" },
  5: { title: "Binary Search Trees (BST) & Node Mutation", code: "" },
  6: { title: "Hash Tables, Collisions, & Rehashing", code: "" },
  7: { title: "Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS", code: "" },
  8: { title: "Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)", code: "" },
  9: { title: "Searching Algorithms (Linear Search vs. Binary Search)", code: "" },
  10: { title: "Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)", code: "" },
  11: { title: "Dynamic Programming (DP), Memoization, & Divide-and-Conquer", code: "" }
};

// Fetches garden-topics.py and fills topicTemplates[n].code for each topic.
async function loadTopicCode() {
  const response = await fetch(TOPICS_PY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${TOPICS_PY_URL} (HTTP ${response.status})`);
  const text = (await response.text()).replace(/\r\n/g, "\n");

  // split() with a capture group returns [preamble, "1", code1, "2", code2, ...]
  const parts = text.split(/^# ={5,} TOPIC (\d+) ={5,}\n/m);
  for (let i = 1; i < parts.length; i += 2) {
    const key = Number(parts[i]);
    if (topicTemplates[key]) topicTemplates[key].code = parts[i + 1].trim() + "\n";
  }
}

async function initPyodide() {
  if (pyodideInstance) return;
  const consoleEl = document.getElementById("output-console");
  if (consoleEl) {
    consoleEl.innerHTML = `<span class="text-amber-400">Loading Python...</span><br>`;
  }
  try {
    pyodideInstance = await loadPyodide();

    // Bridge functions Python may call (pure display — no game rules)
    pyodideInstance.globals.set("addPlantToGrid", addPlantToGrid);
    pyodideInstance.globals.set("updateResources", updateResources);
    pyodideInstance.globals.set("addPlantsToDropdown", addPlantsToDropdown);
    pyodideInstance.globals.set("pushAction", pushAction);
    pyodideInstance.globals.set("updateClimateQueue", updateClimateQueue);
    pyodideInstance.globals.set("renderPlantBook", renderPlantBook);
    pyodideInstance.globals.set("renderTraversalCompare", renderTraversalCompare);
    pyodideInstance.globals.set("updateStamina", updateStamina);
    pyodideInstance.globals.set("updateDay", updateDay);
    pyodideInstance.globals.set("updateInventory", updateInventory);
    pyodideInstance.globals.set("updateMarket", updateMarket);

    await pyodideInstance.runPythonAsync(`
import sys
from js import document

class Console:
    def write(self, text):
        if text and text.strip():
            el = document.getElementById("output-console")
            if el:
                el.innerHTML += text.replace("\\n", "<br>")
    def flush(self):
        pass

sys.stdout = Console()
`);

    if (consoleEl) {
      consoleEl.innerHTML = `<span class="text-emerald-400">Python ready.</span><br>`;
    }
  } catch (err) {
    if (consoleEl) {
      consoleEl.innerHTML = `<span class="text-red-400">Failed to load Python: ${err.message}</span>`;
    }
    throw err;
  }
}

// ---- Pure display bridges (called from Python) ----

// updateClimateQueue(events: list of strings)
// Renders the FIFO climate events. Pass an empty list to clear.
function updateClimateQueue(events) {
  const container = document.getElementById("climate-queue");
  container.innerHTML = "";
  if (!events || !events.length) return;
  events.forEach(event => {
    const div = document.createElement("div");
    div.className = "p-3 bg-amber-950/40 border border-amber-900 rounded-xl text-xs";
    div.innerHTML = `
      <div class="font-bold text-amber-400">${event}</div>
      <div class="text-emerald-300/80"> </div>
    `;
    container.appendChild(div);
  });
}

// addPlantToGrid(pos: int 0-24, name: str)
// Marks a grid cell as planted (display only).
// addPlantToGrid(pos: int 0-24, name: str, stage: "seed"|"sprout"|"mature")
// name === "" clears the tile regardless of stage.
function addPlantToGrid(pos, name, stage) {
  if (!name) {
    delete gardenPlants[pos];
  } else {
    gardenPlants[pos] = { name, stage: stage || "mature" };
  }
  renderGarden();
}

// Stage icons: a seedling and a sprout look the same for every species (nothing
// to draw yet); a mature plant shows its own emoji from plantEmoji.
const STAGE_ICON = { seed: "🌱", sprout: "🌿" };

function renderGarden() {
  const grid = document.getElementById("garden-grid");
  grid.innerHTML = "";
  for (let i = 0; i < 49; i++) {
    const cell = document.createElement("div");
    const entry = gardenPlants[i];
    const mature = entry && entry.stage === "mature";
    cell.className = "aspect-square rounded-lg flex items-center justify-center text-2xl border cursor-pointer transition-colors select-none " +
      (mature ? "bg-[#2a3825] border-emerald-600 hover:border-emerald-400" : entry ? "bg-[#232f1f] border-emerald-900 hover:border-emerald-500" : "bg-[#2a3825] border-emerald-800 hover:border-emerald-400");
    cell.textContent = entry ? (entry.stage === "mature" ? (plantEmoji[entry.name] || "🌱") : STAGE_ICON[entry.stage] || "🌱") : "⬜";
    if (entry) cell.title = `${entry.name} (${entry.stage})`;
    // 7 tiles per row: flat position i  <->  (row, col)
    cell.addEventListener("click", () => handleTileClick(Math.floor(i / 7), i % 7));
    grid.appendChild(cell);
  }
}

// Which tool is active: "plant" | "water" | "harvest" | "shovel"
let selectedTool = "plant";

function selectTool(tool) {
  selectedTool = tool;
  ["plant", "water", "harvest", "shovel"].forEach(name => {
    const button = document.getElementById("tool-" + name);
    button.classList.toggle("bg-[#283623]", name === tool);
    button.classList.toggle("text-emerald-100", name === tool);
    button.classList.toggle("text-emerald-400/80", name !== tool);
  });
}

// Tile click: forwards (row, col, selected tool, selected seed) to Python's
// handle_tile_click. JS stays display-only; Python owns the rules and returns
// a message to show (or None).
function handleTileClick(row, col) {
  const hook = pyodideInstance ? pyodideInstance.globals.get("handle_tile_click") : null;
  if (!hook) { showToast("Run Topics 1 → 4 in the Student Code Editor first."); return; }
  const plantName = document.getElementById("crop-selector").value;
  try {
    const msg = hook(row, col, selectedTool, plantName);
    if (msg) showToast(msg);
  } catch (err) {
    showToast("Python error: " + err.message.trim().split("\n").pop());
  } finally {
    hook.destroy();
  }
}

// Generic caller for a zero/one-argument Python bridge hook, used by End Day and Sell.
function callPythonAction(pyFunctionName, ...args) {
  const hook = pyodideInstance ? pyodideInstance.globals.get(pyFunctionName) : null;
  if (!hook) { showToast("Run Topics 1 → 4 in the Student Code Editor first."); return; }
  try {
    const msg = hook(...args);
    if (msg) showToast(msg);
  } catch (err) {
    showToast("Python error: " + err.message.trim().split("\n").pop());
  } finally {
    hook.destroy();
  }
}

function endDay() {
  callPythonAction("end_day_action");
}

function sellToMarket(name) {
  callPythonAction("sell_to_market_action", name);
}

// updateResources(water, seeds, energy, hope, coins)
// Or pass a single object: updateResources({"water": n, "seeds": n, ...})
// No fallbacks that turn a valid 0 into a default. Caps used only for bar width.
// Energy and Hope still arrive here (Python keeps tracking them for later use;
// see changes.md) but are no longer drawn - only Water, Seeds and Coins are shown.
function updateResources(water, seeds, energy, hope, coins) {
  if (typeof water === "object" && water !== null) {
    const args = water;
    water = args.water !== undefined ? args.water : 0;
    seeds = args.seeds !== undefined ? args.seeds : 0;
    coins = args.coins !== undefined ? args.coins : 0;
  } else {
    water = water !== undefined ? water : 0;
    seeds = seeds !== undefined ? seeds : 0;
    coins = coins !== undefined ? coins : 0;
  }

  const waterMax = 200, seedsMax = 100;

  document.getElementById("water-text").innerText = `${water} / ${waterMax} L`;
  document.getElementById("water-bar").style.width = `${Math.min(100, (water / waterMax) * 100)}%`;

  document.getElementById("seeds-text").innerText = `${seeds} / ${seedsMax}`;
  document.getElementById("seeds-bar").style.width = `${Math.min(100, (seeds / seedsMax) * 100)}%`;

  document.getElementById("coins-text").innerText = `${coins} Coins`;
}

// addPlantsToDropdown(plants: list of [name, emoji, cost])
function addPlantsToDropdown(plants) {
  const select = document.getElementById("crop-selector");
  select.innerHTML = "";
  if (!plants) return;
  plants.forEach(([name, emoji, cost]) => {
    const option = document.createElement("option");
    plantEmoji[name] = emoji;
    option.value = name;
    option.textContent = `${emoji} ${name} (${cost}c)`;
    select.appendChild(option);
  });
}

// renderPlantBook(rows, unlockedCount, totalCount)
// rows: list of [depth, emoji, name, unlocked, note], already in preorder
// (each parent comes right before its children). depth sets the indentation.
function renderPlantBook(rows, unlockedCount, totalCount) {
  const list = document.getElementById("plant-book-list");
  list.innerHTML = "";
  document.getElementById("plant-book-empty").classList.add("hidden");
  document.getElementById("plant-book-count").textContent = `${unlockedCount} / ${totalCount} unlocked`;
  rows.forEach(([depth, emoji, name, unlocked, note]) => {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3 rounded-xl border px-3 py-2 " +
      (depth === 0 ? "bg-[#2a3825] border-emerald-700 mt-3 first:mt-0" : "bg-[#1b2219] border-emerald-900") +
      (unlocked ? "" : " opacity-60");
    row.style.marginLeft = `${depth * 2}rem`;

    const icon = document.createElement("span");
    icon.className = "text-2xl" + (unlocked ? "" : " grayscale");
    icon.textContent = emoji;

    const text = document.createElement("div");
    text.className = "flex-1";
    const title = document.createElement("div");
    title.className = "text-sm font-bold " + (unlocked ? "text-white" : "text-emerald-200/70");
    title.textContent = name;
    const sub = document.createElement("div");
    sub.className = "text-xs text-emerald-300/80";
    sub.textContent = note;
    text.appendChild(title);
    text.appendChild(sub);

    const badge = document.createElement("span");
    badge.className = "text-[10px] font-bold uppercase tracking-widest " + (unlocked ? "text-emerald-400" : "text-amber-400/80");
    badge.textContent = unlocked ? "✓ Unlocked" : "🔒 Locked";

    row.appendChild(icon);
    row.appendChild(text);
    row.appendChild(badge);
    list.appendChild(row);
  });
}

// =====================================================================
// TRAVERSAL COMPARE (demo only - display only, no game logic)
// Python (PlantBook.traversal_orders) does the traversals; this only draws them.
// =====================================================================
const TRAVERSAL_PANELS = [
  { key: "bfs",       short: "BFS",  title: "BFS · Level-order", hint: "Level by level · Queue",  accent: "text-sky-300" },
  { key: "preorder",  short: "Pre",  title: "DFS · Pre-order",   hint: "Node → children",         accent: "text-emerald-300" },
  { key: "inorder",   short: "In",   title: "DFS · In-order",    hint: "1st child → node → rest", accent: "text-emerald-300" },
  { key: "postorder", short: "Post", title: "DFS · Post-order",  hint: "Children → node",         accent: "text-emerald-300" }
];
const DEPTH_COLORS = ["#fbbf24", "#34d399", "#38bdf8", "#c084fc", "#fb7185", "#a3e635", "#f472b6"];

let plantBookMode = "book";   // "book" | "compare"
let traversalData = null;     // { bfs, preorder, inorder, postorder }: lists of [depth, emoji, name, unlocked, isPlant]
let traversalCells = [];      // traversalCells[panel][i] -> the row element for that panel's i-th visited node
let traversalStep = 0;        // how many nodes each traversal has visited so far
let traversalTimer = null;

// renderTraversalCompare(bfs, preorder, inorder, postorder)
// Each argument: list of [depth, emoji, name, unlocked, isPlant], already in visit order.
function renderTraversalCompare(bfs, preorder, inorder, postorder) {
  // Python proxies die when this call returns, and the animation needs the data later: copy to plain JS.
  const copy = rows => (rows && typeof rows.toJs === "function") ? rows.toJs() : rows;
  const next = { bfs: copy(bfs), preorder: copy(preorder), inorder: copy(inorder), postorder: copy(postorder) };
  const total = next.bfs.length;
  const wasComplete = !traversalData || traversalStep >= traversalData.bfs.length;
  traversalData = next;
  traversalStep = wasComplete ? total : Math.min(traversalStep, total);   // keep your place if the book re-renders mid-play
  document.getElementById("traversal-empty").classList.add("hidden");
  document.getElementById("traversal-body").classList.remove("hidden");
  buildTraversalGrid();
  applyTraversalStep();
}

function buildTraversalGrid() {
  const grid = document.getElementById("traversal-grid");
  grid.innerHTML = "";
  traversalCells = [];
  let maxDepth = 0;

  TRAVERSAL_PANELS.forEach(panel => {
    const col = document.createElement("div");
    col.className = "min-w-0";

    const head = document.createElement("div");
    head.className = "tv-head sticky top-0 z-10 h-11 px-2 py-1 mb-1 rounded-lg bg-[#192218] border border-emerald-800/60";
    const title = document.createElement("div");
    title.className = "text-[11px] font-extrabold truncate " + panel.accent;
    title.textContent = panel.title;
    const hint = document.createElement("div");
    hint.className = "text-[10px] text-emerald-300/70 truncate";
    hint.textContent = panel.hint;
    head.title = `${panel.title}: ${panel.hint}`;
    head.appendChild(title);
    head.appendChild(hint);
    col.appendChild(head);

    const cells = [];
    traversalData[panel.key].forEach(([depth, emoji, name, unlocked, isPlant], i) => {
      maxDepth = Math.max(maxDepth, depth);
      const row = document.createElement("div");
      row.className = "tv-row unvisited flex items-center gap-1 h-7 px-1.5 mb-1 rounded-md border text-[11px] " +
        (isPlant ? "bg-[#1b2219] border-emerald-900 text-emerald-50" : "bg-[#2a3825] border-emerald-700 font-bold text-white");
      row.dataset.key = name;
      row.title = `#${i + 1} ${name} (depth ${depth}${unlocked ? "" : ", locked"})`;
      row.style.borderLeftWidth = "4px";
      row.style.borderLeftColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

      const num = document.createElement("span");
      num.className = "tv-num w-5 shrink-0 text-right text-[10px] font-bold tabular-nums text-amber-300";
      num.textContent = i + 1;
      const icon = document.createElement("span");
      icon.className = "shrink-0 text-sm leading-none" + (unlocked ? "" : " grayscale");
      icon.textContent = emoji;
      const label = document.createElement("span");
      label.className = "truncate min-w-0" + (unlocked ? "" : " text-emerald-200/60");
      label.textContent = name;

      row.appendChild(num);
      row.appendChild(icon);
      row.appendChild(label);
      col.appendChild(row);
      cells.push(row);
    });
    traversalCells.push(cells);
    grid.appendChild(col);
  });

  // Legend: the left stripe on every row is its depth in the tree.
  const legend = document.getElementById("traversal-legend");
  legend.innerHTML = "<span>Left stripe = depth:</span>";
  for (let d = 0; d <= maxDepth; d++) {
    const item = document.createElement("span");
    item.className = "flex items-center gap-1";
    const swatch = document.createElement("span");
    swatch.className = "inline-block w-2.5 h-2.5 rounded-sm";
    swatch.style.backgroundColor = DEPTH_COLORS[d % DEPTH_COLORS.length];
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(d === 0 ? "root" : `level ${d}`));
    legend.appendChild(item);
  }

  // Hover any node to light it up in all four lists.
  grid.onmouseover = e => highlightLinked(e.target.closest(".tv-row"));
  grid.onmouseout = () => highlightLinked(null);
}

function highlightLinked(row) {
  const key = row ? row.dataset.key : null;
  traversalCells.forEach(cells => cells.forEach(r => r.classList.toggle("linked", key !== null && r.dataset.key === key)));
}

function applyTraversalStep() {
  if (!traversalData) return;
  const total = traversalData.bfs.length;
  traversalCells.forEach(cells => cells.forEach((row, i) => {
    row.classList.toggle("unvisited", i >= traversalStep);
    row.classList.toggle("current", traversalStep > 0 && traversalStep < total && i === traversalStep - 1);
  }));

  document.getElementById("traversal-step-label").textContent = `Visited ${traversalStep} / ${total}`;
  const slider = document.getElementById("traversal-slider");
  slider.max = total;
  slider.value = traversalStep;

  const now = document.getElementById("traversal-now");
  if (traversalStep === 0) {
    now.textContent = "Nothing visited yet. Press Play or Step.";
  } else if (traversalStep >= total) {
    now.textContent = `All ${total} nodes visited: same tree, four different orders.`;
  } else {
    now.textContent = `Step ${traversalStep}: ` +
      TRAVERSAL_PANELS.map(p => `${p.short} → ${traversalData[p.key][traversalStep - 1][2]}`).join("  ·  ");
  }
  scrollTraversalIntoView();
}

// Rows have a fixed height, so row i lines up across all four lists: scroll them together.
function scrollTraversalIntoView() {
  const total = traversalData.bfs.length;
  if (traversalStep < 1 || traversalStep >= total) return;
  const wrap = document.getElementById("traversal-scroll");
  const row = traversalCells[0][traversalStep - 1];
  const head = wrap.querySelector(".tv-head");
  const headH = head ? head.offsetHeight : 0;
  const top = row.offsetTop, bottom = top + row.offsetHeight;
  if (top < wrap.scrollTop + headH) wrap.scrollTop = Math.max(0, top - headH - 4);
  else if (bottom > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = bottom - wrap.clientHeight + 4;
}

function toggleTraversalPlay() {
  if (traversalTimer) { pauseTraversal(); return; }
  if (!traversalData) return;
  if (traversalStep >= traversalData.bfs.length) traversalStep = 0;   // finished? replay from the start
  applyTraversalStep();
  startTraversalTimer();
}

function startTraversalTimer() {
  const delay = Number(document.getElementById("traversal-speed").value);
  traversalTimer = setInterval(() => {
    stepTraversal(true);
    if (traversalStep >= traversalData.bfs.length) pauseTraversal();
  }, delay);
  document.getElementById("traversal-play").textContent = "⏸ Pause";
}

function pauseTraversal() {
  if (traversalTimer) clearInterval(traversalTimer);
  traversalTimer = null;
  const button = document.getElementById("traversal-play");
  if (button) button.textContent = "▶ Play";
}

function changeTraversalSpeed() {
  if (!traversalTimer) return;
  clearInterval(traversalTimer);
  startTraversalTimer();
}

function stepTraversal(fromTimer) {
  if (!traversalData) return;
  if (!fromTimer) pauseTraversal();
  const total = traversalData.bfs.length;
  traversalStep = traversalStep >= total ? 1 : traversalStep + 1;   // stepping past the end wraps to the start
  applyTraversalStep();
}

function resetTraversal() {
  pauseTraversal();
  traversalStep = 0;
  applyTraversalStep();
}

function scrubTraversal(value) {
  pauseTraversal();
  traversalStep = Number(value);
  applyTraversalStep();
}

// Plant Book view toggle: the normal book vs. the traversal comparison.
function setPlantBookMode(mode) {
  plantBookMode = mode;
  document.getElementById("plant-book-standard").classList.toggle("hidden", mode !== "book");
  document.getElementById("plant-book-compare").classList.toggle("hidden", mode !== "compare");
  [["book", "pbmode-book"], ["compare", "pbmode-compare"]].forEach(([name, id]) => {
    const button = document.getElementById(id);
    button.classList.toggle("bg-[#283623]", mode === name);
    button.classList.toggle("text-emerald-100", mode === name);
    button.classList.toggle("text-emerald-400/80", mode !== name);
  });
  if (mode !== "compare") pauseTraversal();
}

// updateStamina(current, max)
function updateStamina(current, max) {
  document.getElementById("stamina-text").innerText = `${current} / ${max}`;
  document.getElementById("stamina-bar").style.width = `${Math.min(100, (current / max) * 100)}%`;
}

// updateDay(day)
function updateDay(day) {
  document.getElementById("day-counter").innerText = day;
}

// updateInventory(rows: list of [name, emoji, qty, sellPrice])
function updateInventory(rows) {
  const list = document.getElementById("inventory-list");
  list.innerHTML = "";
  document.getElementById("inventory-empty").classList.toggle("hidden", rows && rows.length > 0);
  (rows || []).forEach(([name, emoji, qty, sellPrice]) => {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3 rounded-xl border border-emerald-900 bg-[#1b2219] px-3 py-2";
    row.innerHTML = `
      <span class="text-2xl">${emoji}</span>
      <div class="flex-1">
        <div class="text-sm font-bold text-white">${name} <span class="text-emerald-300/80 font-normal">x${qty}</span></div>
        <div class="text-xs text-emerald-300/80">Sells for ${sellPrice}c each</div>
      </div>
      <button class="text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Sell All</button>
    `;
    row.querySelector("button").addEventListener("click", () => sellToMarket(name));
    list.appendChild(row);
  });
}

// updateMarket(rows: list of [name, emoji, qty, sellPrice], total: int)
function updateMarket(rows, total) {
  const list = document.getElementById("market-list");
  list.innerHTML = "";
  document.getElementById("market-empty").classList.toggle("hidden", rows && rows.length > 0);
  (rows || []).forEach(([name, emoji, qty, sellPrice]) => {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3 rounded-xl border border-amber-900 bg-amber-950/30 px-3 py-2";
    row.innerHTML = `
      <span class="text-2xl">${emoji}</span>
      <div class="flex-1 text-sm font-bold text-white">${name} <span class="text-amber-300/80 font-normal">x${qty}</span></div>
      <span class="text-xs font-bold text-amber-300">${sellPrice * qty}c</span>
    `;
    list.appendChild(row);
  });
  document.getElementById("market-total").innerText = total || 0;
}

// pushAction(action: str)
// Appends a display label to the Action History panel (no JS undo logic).
function pushAction(action) {
  displayActionHistory.push(action);
  if (displayActionHistory.length > 8) displayActionHistory.shift();
  renderActionStack();
}

function renderActionStack() {
  const container = document.getElementById("action-stack");
  container.innerHTML = "";
  [...displayActionHistory].reverse().forEach(act => {
    const div = document.createElement("div");
    div.className = "bg-emerald-950/60 border-l-2 border-amber-500 px-3 py-2 rounded text-xs text-emerald-100";
    div.textContent = act;
    container.appendChild(div);
  });
}


function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-6 right-6 bg-emerald-900 border border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 text-sm";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

async function runPythonCode() {
  const consoleEl = document.getElementById("output-console");
  consoleEl.innerHTML = `<span class="text-amber-400">Running...</span><br>`;
  try {
    await initPyodide();
    const code = document.getElementById("code-editor").value.trim();
    await pyodideInstance.runPythonAsync(code);
  } catch (err) {
    consoleEl.innerHTML += `<span class="text-red-400">Error: ${err.message}</span>`;
  }
}

// Runs every topic 1 -> N in order, in one go, so you don't have to pick each
// one from the dropdown and press Run individually. Stops at the first topic
// that errors (later topics likely depend on it), and leaves your current
// dropdown selection and editor content untouched.
async function runAllTopics() {
  const consoleEl = document.getElementById("output-console");
  consoleEl.innerHTML = `<span class="text-amber-400">Running all topics...</span><br>`;
  try {
    await initPyodide();
  } catch (err) {
    consoleEl.innerHTML += `<span class="text-red-400">Failed to load Python: ${err.message}</span>`;
    return;
  }
  const topicKeys = Object.keys(topicTemplates).map(Number).sort((a, b) => a - b);
  for (const key of topicKeys) {
    const title = topicTemplates[key].title;
    consoleEl.innerHTML += `<span class="text-emerald-400">=== Topic ${key}: ${title} ===</span><br>`;
    try {
      await pyodideInstance.runPythonAsync(topicTemplates[key].code.trim());
    } catch (err) {
      consoleEl.innerHTML += `<span class="text-red-400">Error in Topic ${key}: ${err.message.trim().split("\n").pop()}</span><br>`;
      showToast(`Stopped at Topic ${key} - see the console for the error.`);
      return;
    }
  }
  consoleEl.innerHTML += `<span class="text-emerald-400">All ${topicKeys.length} topics ran successfully.</span><br>`;
  showToast(`All ${topicKeys.length} topics ran successfully.`);
}

function loadTopic() {
  const key = document.getElementById("topic-selector").value;
  const editor = document.getElementById("code-editor");
  if (topicTemplates[key].code) {
    editor.value = topicTemplates[key].code;
  } else if (topicLoadError) {
    editor.value =
      `# COULD NOT LOAD ${TOPICS_PY_URL}\n# Reason: ${topicLoadError}\n#\n` +
      `# 1) If the address bar starts with file://, the browser blocks fetch().\n` +
      `#    Serve the folder instead: run  python -m http.server  in it,\n` +
      `#    then open http://localhost:8000/garden-simulator.html\n` +
      `# 2) Check the filename matches exactly (hyphen vs underscore): ${TOPICS_PY_URL}\n` +
      `# 3) Keep the .html, .js and .py files in the same folder.`;
  } else {
    editor.value = `# No code found for Topic ${key} in ${TOPICS_PY_URL}.\n# Check that it has a line:  # ===== TOPIC ${key} =====`;
  }
}

function switchTab(tab) {
  if (tab !== "book") pauseTraversal();
  ["game", "code", "book", "inventory", "market"].forEach(name => {
    const button = document.getElementById("tab-" + name);
    document.getElementById("view-" + name).classList.toggle("hidden", tab !== name);
    button.classList.toggle("bg-[#283623]", tab === name);
    button.classList.toggle("text-emerald-100", tab === name);
    button.classList.toggle("text-emerald-400/80", tab !== name);
  });
}

window.onload = async () => {
  document.getElementById("version-badge").textContent = "v" + APP_VERSION;
  lucide.createIcons();
  renderGarden();
  renderActionStack();

  // Resources stay at 0 until your Python calls updateResources(...)
  updateResources(0, 0, 0, 0, 0);

  const select = document.getElementById("topic-selector");
  Object.keys(topicTemplates).forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = topicTemplates[k].title;
    select.appendChild(opt);
  });
  try {
    await loadTopicCode();
  } catch (err) {
    topicLoadError = err.message;
    console.error("loadTopicCode failed:", err);
    showToast("Could not load " + TOPICS_PY_URL + " - open the Student Code Editor tab for details.");
  }
  loadTopic();
  switchTab("game");

  // Pre-load Pyodide in the background so the first Run is faster
  initPyodide().catch(() => {});
};