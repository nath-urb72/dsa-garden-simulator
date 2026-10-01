// =====================================================================
// SEMANTIC VERSIONING (SemVer 2.0.0)
// Single source of truth. Do not hard-code the version elsewhere.
// MAJOR: breaking change (e.g. changing bridge function names/signatures that Python depends on)
// MINOR: new backward-compatible feature (e.g. finishing a new topic's code)
// PATCH: bug fix or small tweak with no new feature
// Use 0.x.y while in development; move to 1.0.0 once all 11 topics are complete.
// =====================================================================
const APP_VERSION = "0.9.0";

let pyodideInstance = null;
let gardenPlants = {};
// name -> emoji, filled by addPlantsToDropdown so tiles can draw each plant's own emoji.
let plantEmoji = {};

// Display-only list of action labels (populated by Python via pushAction). No JS game logic.
let displayActionHistory = [];

// =====================================================================
// TOPIC TEMPLATES — paste your Python for each topic into the matching entry.
// Call the bridge functions from your Python to update the UI.
// =====================================================================
const topicTemplates = {
  1: {
    title: "Python OOP + Big O + Stacks",
    code: `# Topic 1: Python OOP + Big O + Stacks
#
# A stack is LIFO (last in, first out). Python's list already behaves like one
# if you only ever add/remove from the SAME end - append() is "push", pop() is
# "pop", both at the end of the list, which we treat as the "top" of the stack.
#
# This is now a pure ACTION LOG, not an undo mechanism: once planted, watered,
# harvested or shoveled, an action cannot be reversed - only recorded. Every
# operation below is still O(1), because a log only ever grows from one end.

class GameAction:
    def __init__(self, label):
        self.label = label


class ActionHistoryStack:
    def __init__(self):
        self.action_stack = []   # the END of the list is the TOP of the stack

    def push_action(self, label):   # O(1) amortized
        self.action_stack.append(GameAction(label))
        pushAction(label)   # bridge: show the label in the Action History panel

    def peek(self):   # O(1): look at the most recent action without removing it
        if self.is_empty():
            return None
        return self.action_stack[-1]

    def is_empty(self):   # O(1)
        return len(self.action_stack) == 0

    def size(self):   # O(1)
        return len(self.action_stack)


if "stack" not in globals():
    stack = ActionHistoryStack()

print(f"Action History Stack ready! ({stack.size()} action(s) recorded)\\n")
print("Every planting, watering, harvest and shovel use is logged here permanently.")
`
  },
  2: {
    title: "Queues & Deques (FIFO Elements)",
    code: `# Topic 2: Queues & Deques (FIFO Elements)
# (unchanged from before - included so Topics 1-4 can run as one block)

import random
from collections import deque

HAZARD_TABLE = {
    "Drought":     {"water": -30},
    "Melting Ice": {"energy": -20},
    "Flood":       {"seeds": -10},
}


class ClimateEvent:
    def __init__(self, name, effects):
        self.name = name
        self.effects = effects


class ClimateQueue():
    def __init__(self):
        self.queue = deque()

    def add_challenge(self, event_name):   # O(1): enqueue at the back
        self.queue.append(ClimateEvent(event_name, HAZARD_TABLE[event_name]))
        print(f"Successfully added {event_name}!\\n")
        self.refresh_display()

    def process_hazard(self):   # O(1): dequeue from the front
        if len(self.queue) == 0:
            print("Empty queue!\\n")
            return None
        event = self.queue.popleft()
        print(f"Processed {event.name}\\n")
        self.add_challenge(random.choice(list(HAZARD_TABLE)))
        return event

    def refresh_display(self):
        updateClimateQueue([event.name for event in self.queue])


if "q" not in globals():
    q = ClimateQueue()
    for hazard in ("Drought", "Melting Ice", "Flood"):
        q.add_challenge(hazard)

q.refresh_display()
print("Climate Queue (FIFO) ready!")
`
  },
  3: {
    title: "Static/Dynamic Arrays, 2D Lists, & Memory Structures",
    code: `# Topic 3: Static/Dynamic Arrays, 2D Lists, & Memory Structures
#
# - Dynamic array: game.catalog is a list that grows with append() (amortized O(1))
#   as new plants unlock. PLANT_DATA is a hash table (dict) keyed by plant name,
#   giving O(1) average lookup for every plant's stats.
# - Static-style array: the garden grid is allocated once at a fixed size (5 x 5).
# - 2D list: a list of row lists. grid[row][col] is an O(1) lookup.
# - Memory layout: the UI's 25 tiles are ONE flat sequence, so a (row, col) pair
#   maps to a flat position with   pos = row * cols + col   (row-major order).
#
# This topic uses \`stack\` (Topic 1) and \`q\` (Topic 2), so run Topics 1 -> 2 -> 3.

def _require(*names):
    missing = [name for name in names if name not in globals()]
    if missing:
        raise RuntimeError("Run the earlier topics first (1 = Stack, 2 = Queue). Missing: " + ", ".join(missing))

_require("stack", "q")


# =====================================================================
# MASTER PLANT DATA (a dict = a hash table: O(1) average lookup by name)
# =====================================================================

COLOR_CHAINS = {
    "RED":          {"chain": "RED",   "depth": 0, "opens_after": None},
    "ORANGE":       {"chain": "RED",   "depth": 1, "opens_after": "RED"},
    "YELLOW":       {"chain": "RED",   "depth": 1, "opens_after": "RED"},
    "GREEN":        {"chain": "GREEN", "depth": 0, "opens_after": None},
    "BLUE_VIOLET":  {"chain": "GREEN", "depth": 1, "opens_after": "GREEN"},
    "PINK":         {"chain": "GREEN", "depth": 2, "opens_after": "BLUE_VIOLET"},
    "BROWN":        {"chain": "BROWN", "depth": 0, "opens_after": None},
}

# Harvests of the PREVIOUS plant in the same tier needed to unlock the next one.
UNLOCK_THRESHOLDS = [None, 10, 40, 140, 500]

TIER_ORDER = {
    "RED":         ["Tomato", "Apple", "Strawberry", "Chili Pepper", "Cherry"],
    "ORANGE":      ["Carrot", "Tangerine"],
    "YELLOW":      ["Corn", "Banana", "Lemon", "Sunflower", "Mango"],
    "GREEN":       ["Lettuce", "Cucumber", "Bell Pepper", "Broccoli", "Avocado"],
    "BLUE_VIOLET": ["Grapes", "Sweet Potato", "Eggplant", "Blueberry"],
    "PINK":        ["Chrysanthemum", "Tulip", "Peach", "Hibiscus", "Cherry Blossom"],
    "BROWN":       ["Potato", "Onion", "Garlic", "Coconut"],
}

_EMOJI = {
    "Tomato": "🍅", "Apple": "🍎", "Strawberry": "🍓", "Chili Pepper": "🌶️", "Cherry": "🍒",
    "Carrot": "🥕", "Tangerine": "🍊",
    "Corn": "🌽", "Banana": "🍌", "Lemon": "🍋", "Sunflower": "🌻", "Mango": "🥭",
    "Lettuce": "🥬", "Cucumber": "🥒", "Bell Pepper": "🫑", "Broccoli": "🥦", "Avocado": "🥑",
    "Grapes": "🍇", "Sweet Potato": "🍠", "Eggplant": "🍆", "Blueberry": "🫐",
    "Chrysanthemum": "💮", "Tulip": "🌷", "Peach": "🍑", "Hibiscus": "🌺", "Cherry Blossom": "🌸",
    "Potato": "🥔", "Onion": "🧅", "Garlic": "🧄", "Coconut": "🥥",
}


def _build_plant_data():
    data = {}
    for color, names in TIER_ORDER.items():
        depth = COLOR_CHAINS[color]["depth"]
        chain = COLOR_CHAINS[color]["chain"]
        opens_after = COLOR_CHAINS[color]["opens_after"]
        for position, name in enumerate(names):
            grow_days = 2 + position + (depth * 2)
            cost = 20 + (position * 10) + (depth * 20)
            data[name] = {
                "name": name, "emoji": _EMOJI[name], "color": color, "chain": chain,
                "depth": depth, "position": position,
                "cost": cost, "grow_days": grow_days, "water_need": grow_days * 20,
                "sell_price": round(cost * 1.5),
                "unlocked_by_default": (position == 0 and depth == 0),
                "unlock_threshold": UNLOCK_THRESHOLDS[position] if position > 0 else None,
                "opens_after_tier": opens_after if position == 0 else None,
            }
    return data


if "PLANT_DATA" not in globals():
    PLANT_DATA = _build_plant_data()


class Plant:
    """A planted instance. Every plant starts as a SEED and grows toward MATURE
    as growth_progress rises. Only a MATURE plant can be harvested or sold."""
    STAGES = ("seed", "sprout", "mature")

    def __init__(self, name, emoji, cost, water_need, grow_days=1, sell_price=0):
        self.name = name
        self.emoji = emoji
        self.cost = cost
        self.water_need = water_need
        self.grow_days = max(1, grow_days)
        self.sell_price = sell_price
        self.growth_progress = 0
        self.watered_today = False
        self.stage = "seed"
        self.update_stage()

    @classmethod
    def from_data(cls, name):   # O(1) average: PLANT_DATA is a hash table
        d = PLANT_DATA[name]
        return cls(d["name"], d["emoji"], d["cost"], d["water_need"], d["grow_days"], d["sell_price"])

    def clone(self):
        """A fresh SEED of this species - used when planting a new tile."""
        return Plant(self.name, self.emoji, self.cost, self.water_need, self.grow_days, self.sell_price)

    def sprout_threshold(self):   # the 1/3 mark of its total grow_days
        return max(1, self.grow_days // 3)

    def update_stage(self):
        if self.growth_progress >= self.grow_days:
            self.stage = "mature"
        elif self.growth_progress >= self.sprout_threshold():
            self.stage = "sprout"
        else:
            self.stage = "seed"

    def grow_one_day(self):
        if self.stage != "mature":
            self.growth_progress = min(self.grow_days, self.growth_progress + 1)
            self.update_stage()
        self.watered_today = False

    def water(self):
        """+1 growth_progress on top of the natural daily tick. Returns True if it helped."""
        if self.watered_today or self.stage == "mature":
            return False
        self.growth_progress = min(self.grow_days, self.growth_progress + 1)
        self.watered_today = True
        self.update_stage()
        return True


class Resources:
    CAPS = {"water": 200, "seeds": 100, "energy": 120, "hope": 100, "coins": None}

    def __init__(self, water, seeds, energy, hope, coins):
        self.values = {"water": water, "seeds": seeds, "energy": energy, "hope": hope, "coins": coins}

    def get(self, key):
        return self.values[key]

    def change(self, key, amount):
        value = self.values[key] + amount
        cap = self.CAPS[key]
        self.values[key] = max(0, value if cap is None else min(cap, value))

    def sync(self):
        updateResources(**self.values)


class GardenGrid:
    def __init__(self, rows=10, cols=10):
        self.rows = rows
        self.cols = cols
        self.cells = [[None] * cols for _ in range(rows)]

    def to_position(self, row, col):
        return row * self.cols + col

    def in_bounds(self, row, col):
        return 0 <= row < self.rows and 0 <= col < self.cols

    def is_empty(self, row, col):
        return self.cells[row][col] is None

    def place(self, row, col, plant):
        self.cells[row][col] = plant
        addPlantToGrid(self.to_position(row, col), plant.name, plant.stage)

    def remove(self, row, col):
        plant = self.cells[row][col]
        self.cells[row][col] = None
        addPlantToGrid(self.to_position(row, col), "", "")
        return plant

    def redraw(self, row, col):   # re-sends a tile's current look without changing it
        plant = self.cells[row][col]
        if plant is not None:
            addPlantToGrid(self.to_position(row, col), plant.name, plant.stage)

    def each_plant(self):
        for row in range(self.rows):
            for col in range(self.cols):
                plant = self.cells[row][col]
                if plant is not None:
                    yield row, col, plant


class Inventory:
    """Harvested plants waiting to be sold. A dict = a hash table, name -> quantity."""
    def __init__(self):
        self.items = {}

    def add(self, name, qty=1):
        self.items[name] = self.items.get(name, 0) + qty

    def take(self, name, qty):
        have = self.items.get(name, 0)
        taken = min(have, qty)
        if taken <= 0:
            return 0
        self.items[name] = have - taken
        if self.items[name] <= 0:
            del self.items[name]
        return taken

    def rows(self):
        return [(name, PLANT_DATA[name]["emoji"], qty, PLANT_DATA[name]["sell_price"])
                for name, qty in sorted(self.items.items())]


class Market:
    """Plants staged for sale. Everything here sells when the day ends."""
    def __init__(self):
        self.items = {}

    def stage(self, name, qty):
        self.items[name] = self.items.get(name, 0) + qty

    def rows(self):
        return [(name, PLANT_DATA[name]["emoji"], qty, PLANT_DATA[name]["sell_price"])
                for name, qty in sorted(self.items.items())]

    def total(self):
        return sum(PLANT_DATA[name]["sell_price"] * qty for name, qty in self.items.items())

    def payout(self):
        earned = self.total()
        self.items = {}
        return earned


class GardenGame:
    HAZARD_EVERY = 3
    MAX_STAMINA = 500
    STAMINA_COSTS = {"plant": 15, "water": 10, "harvest": 10, "shovel": 10}
    WATER_COST = 10   # Water resource spent per use of the watering can
    SEEDS_PER_PLANT = 1

    def __init__(self, catalog, resources, grid=None):
        self.catalog = catalog
        self.resources = resources
        self.grid = grid or GardenGrid()
        self.plants_since_hazard = 0
        self.stamina = self.MAX_STAMINA
        self.day = 1
        self.harvest_counts = {}   # name -> lifetime harvest count, used to unlock the next plant
        self.inventory = Inventory()
        self.market = Market()

    # ---- catalog (dynamic array) ----
    def find_plant(self, name):   # O(n) scan of the currently-unlocked catalog
        for plant in self.catalog:
            if plant.name == name:
                return plant
        return None

    def add_to_catalog(self, plant):   # O(1) amortized
        self.catalog.append(plant)
        self.refresh_dropdown()

    # ---- stamina ----
    def spend_stamina(self, action):
        cost = self.STAMINA_COSTS[action]
        if self.stamina < cost:
            return "Too tired for that today. End the day to rest."
        self.stamina -= cost
        self.sync_stamina()
        return None

    def _maybe_auto_end_day(self):
        if self.stamina <= 0:
            return self.end_day()
        return None

    # ---- the four tile actions ----
    def plant_at(self, row, col, plant_name):
        prototype = self.find_plant(plant_name)
        if prototype is None:
            return "Pick a seed from the Seed Bag first."
        if not self.grid.in_bounds(row, col):
            return "That tile is outside the garden."
        if not self.grid.is_empty(row, col):
            return f"({row}, {col}) is already planted. Try watering, harvesting, or the shovel."
        if self.resources.get("coins") < prototype.cost:
            return f"Not enough coins for {prototype.name} ({prototype.cost}c)."
        if self.resources.get("seeds") < self.SEEDS_PER_PLANT:
            return "Out of seeds!"
        stamina_msg = self.spend_stamina("plant")
        if stamina_msg:
            return stamina_msg

        self.resources.change("coins", -prototype.cost)
        self.resources.change("seeds", -self.SEEDS_PER_PLANT)
        self.grid.place(row, col, prototype.clone())
        stack.push_action(f"Planted {prototype.name} at ({row}, {col})")

        hazard_msg = self.trigger_hazard_if_due()
        self.resources.sync()
        end_msg = self._maybe_auto_end_day()
        return end_msg or hazard_msg or f"Planted {prototype.name}."

    def water_at(self, row, col):
        if not self.grid.in_bounds(row, col):
            return "That tile is outside the garden."
        plant = self.grid.cells[row][col]
        if plant is None:
            return "Nothing planted there yet."
        if plant.stage == "mature":
            return f"{plant.name} is already fully grown."
        if plant.watered_today:
            return f"{plant.name} has already been watered today."
        if self.resources.get("water") < self.WATER_COST:
            return "Not enough water in reserve."
        stamina_msg = self.spend_stamina("water")
        if stamina_msg:
            return stamina_msg

        self.resources.change("water", -self.WATER_COST)
        plant.water()
        self.grid.redraw(row, col)
        stack.push_action(f"Watered {plant.name} at ({row}, {col})")
        self.resources.sync()
        end_msg = self._maybe_auto_end_day()
        return end_msg or f"Watered {plant.name} - now {plant.stage}."

    def harvest_at(self, row, col):
        if not self.grid.in_bounds(row, col):
            return "That tile is outside the garden."
        plant = self.grid.cells[row][col]
        if plant is None:
            return "Nothing to harvest there."
        if plant.stage != "mature":
            return f"{plant.name} isn't ready yet ({plant.stage})."
        stamina_msg = self.spend_stamina("harvest")
        if stamina_msg:
            return stamina_msg

        self.grid.remove(row, col)
        self.inventory.add(plant.name, 1)
        self.harvest_counts[plant.name] = self.harvest_counts.get(plant.name, 0) + 1
        stack.push_action(f"Harvested {plant.name} at ({row}, {col})")
        self.refresh_inventory()

        newly_unlocked = self.check_unlocks()
        message = f"Harvested {plant.name}!"
        if newly_unlocked:
            names = ", ".join(f"{PLANT_DATA[n]['emoji']} {n}" for n in newly_unlocked)
            message += f" Unlocked: {names}!"

        end_msg = self._maybe_auto_end_day()
        return end_msg or message

    def shovel_at(self, row, col):
        if not self.grid.in_bounds(row, col):
            return "That tile is outside the garden."
        plant = self.grid.cells[row][col]
        if plant is None:
            return "Nothing planted there to remove."
        stamina_msg = self.spend_stamina("shovel")
        if stamina_msg:
            return stamina_msg

        self.grid.remove(row, col)
        stack.push_action(f"Removed {plant.name} at ({row}, {col}) with the shovel")
        end_msg = self._maybe_auto_end_day()
        return end_msg or f"Removed the {plant.name}. No refund."

    # ---- hazards (unchanged trigger, still tied to planting) ----
    def trigger_hazard_if_due(self):
        self.plants_since_hazard += 1
        if self.plants_since_hazard < self.HAZARD_EVERY:
            return None
        self.plants_since_hazard = 0
        event = q.process_hazard()
        if event is None:
            return None
        for resource, change in event.effects.items():
            self.resources.change(resource, change)
        summary = ", ".join(f"{change:+d} {resource}" for resource, change in event.effects.items())
        return f"{event.name} hit the garden! ({summary})"

    # ---- unlocking: harvest counts drive the color-tier chain from Topic 4 ----
    def check_unlocks(self):
        newly_unlocked = []
        changed = True
        while changed:
            changed = False
            unlocked_names = {plant.name for plant in self.catalog}

            # within a tier: position p unlocks once the previous plant hits its threshold
            for names in TIER_ORDER.values():
                for position in range(1, len(names)):
                    name = names[position]
                    if name in unlocked_names:
                        continue
                    previous = names[position - 1]
                    if self.harvest_counts.get(previous, 0) >= UNLOCK_THRESHOLDS[position]:
                        self.add_to_catalog(Plant.from_data(name))
                        newly_unlocked.append(name)
                        unlocked_names.add(name)
                        changed = True

            # between tiers: a tier's first plant opens once its whole prerequisite tier is unlocked
            for color, meta in COLOR_CHAINS.items():
                if meta["opens_after"] is None:
                    continue
                prereq_names = TIER_ORDER[meta["opens_after"]]
                if all(name in unlocked_names for name in prereq_names):
                    first = TIER_ORDER[color][0]
                    if first not in unlocked_names:
                        self.add_to_catalog(Plant.from_data(first))
                        newly_unlocked.append(first)
                        unlocked_names.add(first)
                        changed = True
        if newly_unlocked and "plant_book" in globals():
            plant_book.render()   # guarded: Topic 4 may not have run yet
        return newly_unlocked

    # ---- market ----
    def sell_to_market(self, name):
        qty = self.inventory.items.get(name, 0)
        if qty <= 0:
            return "You don't have any of that to sell."
        self.inventory.take(name, qty)
        self.market.stage(name, qty)
        self.refresh_inventory()
        self.refresh_market()
        return f"Moved {qty}x {name} to the market."

    # ---- ending the day ----
    def end_day(self):
        for row, col, plant in list(self.grid.each_plant()):
            plant.grow_one_day()
            self.grid.redraw(row, col)

        earned = self.market.payout()
        if earned:
            self.resources.change("coins", earned)

        self.day += 1
        self.stamina = self.MAX_STAMINA
        self.plants_since_hazard = 0

        self.resources.sync()
        self.sync_stamina()
        self.sync_day()
        self.refresh_inventory()
        self.refresh_market()

        stack.push_action(f"Day ended - Day {self.day} begins")
        message = f"Day {self.day} begins. Everyone is rested."
        if earned:
            message += f" Market payout: +{earned} coins."
        return message

    # ---- display refreshers ----
    def refresh_dropdown(self):
        addPlantsToDropdown([(plant.name, plant.emoji, plant.cost) for plant in self.catalog])

    def refresh_inventory(self):
        updateInventory(self.inventory.rows())

    def refresh_market(self):
        updateMarket(self.market.rows(), self.market.total())

    def sync_stamina(self):
        updateStamina(self.stamina, self.MAX_STAMINA)

    def sync_day(self):
        updateDay(self.day)


# ---- functions the page calls when the player acts ----
def handle_tile_click(row, col, tool, plant_name):
    if tool == "plant":
        return game.plant_at(row, col, plant_name)
    if tool == "water":
        return game.water_at(row, col)
    if tool == "harvest":
        return game.harvest_at(row, col)
    if tool == "shovel":
        return game.shovel_at(row, col)
    return f"Unknown tool: {tool}"

def sell_to_market_action(name):
    return game.sell_to_market(name)

def end_day_action():
    return game.end_day()


if "game" not in globals():
    starters = [Plant.from_data(name) for name, d in PLANT_DATA.items() if d["unlocked_by_default"]]
    game = GardenGame(
        catalog=starters,
        resources=Resources(water=200, seeds=90, energy=110, hope=80, coins=999),
    )

game.refresh_dropdown()
game.resources.sync()
game.sync_stamina()
game.sync_day()
game.refresh_inventory()
game.refresh_market()
print(f"Master plant data ready: {len(PLANT_DATA)} plants across {len(TIER_ORDER)} tiers.")
print(f"Day {game.day}, Stamina {game.stamina}/{game.MAX_STAMINA}. "
      + f"Starters: " + ", ".join(p.name for p in game.catalog) + "\\n")
print("Pick a tool (Plant / Water / Harvest / Shovel) and click a tile in the Interactive Sanctuary.")
`
  },
  4: {
    title: "Hierarchical Trees & Traversals",
    code: `# Topic 4: Hierarchical Trees & Traversals
#
# A tree is a hierarchy of nodes: one ROOT, and every other node has exactly one
# parent and any number of children. This tree mirrors the color-tier chain from
# Topic 3's PLANT_DATA:
#
#   Plant Book
#   |-- RED (tier)
#   |   |-- Tomato, Apple, ...          <- RED's own plants
#   |   |-- ORANGE (tier)               <- a SUB-tier, opens after RED
#   |   |   '-- Carrot, Tangerine
#   |   '-- YELLOW (tier)               <- a SUB-tier, opens after RED
#   |       '-- Corn, Banana, ...
#   |-- GREEN (tier)
#   |   |-- Lettuce, Cucumber, ...
#   |   '-- BLUE_VIOLET (tier)
#   |       |-- Grapes, Sweet Potato, ...
#   |       '-- PINK (tier)
#   |           '-- Chrysanthemum, Tulip, ...
#   '-- BROWN (tier)
#       '-- Potato, Onion, Garlic, Coconut
#
# Three ways to visit every node (each O(n), n = number of nodes):
#   - Preorder:    a node first, then its children       -> builds the Plant Book rows
#   - Postorder:   a node's children first, then itself  -> counts unlocked plants per tier
#   - Level-order: one level at a time (uses a queue)    -> prints the book layer by layer

from collections import deque

if "game" not in globals():
    raise RuntimeError("Run the earlier topics first (Topic 3 sets up PLANT_DATA and the garden). Missing: game")


class PlantNode:
    def __init__(self, label, emoji=None, is_plant=False, plant_name=None):
        self.label = label
        self.emoji = emoji
        self.is_plant = is_plant
        self.plant_name = plant_name
        self.children = []

    def add_child(self, child):   # O(1)
        self.children.append(child)
        return child

    def preorder(self, depth=0, result=None):
        if result is None:
            result = []
        result.append((depth, self))
        for child in self.children:
            child.preorder(depth + 1, result)
        return result

    def tally(self, unlocked_names):
        """Postorder: children counted before their parent; totals roll upward."""
        unlocked, total = 0, 0
        for child in self.children:
            child_unlocked, child_total = child.tally(unlocked_names)
            unlocked += child_unlocked
            total += child_total
        if self.is_plant:
            total += 1
            if self.plant_name in unlocked_names:
                unlocked += 1
        return unlocked, total

    def level_order(self):
        levels = []
        waiting = deque([(0, self)])
        while waiting:
            depth, node = waiting.popleft()   # O(1): front of the queue
            if depth == len(levels):
                levels.append([])
            levels[depth].append(node)
            for child in node.children:
                waiting.append((depth + 1, child))
        return levels


def _build_tier_node(color):
    node = PlantNode(color)
    for name in TIER_ORDER[color]:
        node.add_child(PlantNode(name, PLANT_DATA[name]["emoji"], is_plant=True, plant_name=name))
    for other_color, meta in COLOR_CHAINS.items():
        if meta["opens_after"] == color:
            node.add_child(_build_tier_node(other_color))
    return node


class PlantBook:
    def __init__(self, game):
        self.game = game
        self.root = self.build_tree()

    def build_tree(self):
        root = PlantNode("Plant Book")
        for color, meta in COLOR_CHAINS.items():
            if meta["depth"] == 0:
                root.add_child(_build_tier_node(color))
        return root

    def unlocked_names(self):
        return {plant.name for plant in self.game.catalog}

    def _requirement_note(self, name, unlocked_names):
        d = PLANT_DATA[name]
        if d["unlocked_by_default"]:
            return "Starter plant"
        if d["opens_after_tier"]:
            prereq_names = TIER_ORDER[d["opens_after_tier"]]
            have = sum(1 for n in prereq_names if n in unlocked_names)
            return f"Opens once every {d['opens_after_tier']} plant is unlocked ({have}/{len(prereq_names)})"
        names = TIER_ORDER[d["color"]]
        previous = names[d["position"] - 1]
        need = d["unlock_threshold"]
        have = min(need, self.game.harvest_counts.get(previous, 0))
        return f"Needs {need} harvests of {previous} ({have}/{need})"

    def rows(self):
        unlocked_names = self.unlocked_names()
        rows = []
        for depth, node in self.root.preorder():
            if depth == 0:
                continue
            if node.is_plant:
                note = self._requirement_note(node.plant_name, unlocked_names)
                unlocked = node.plant_name in unlocked_names
                rows.append((depth - 1, node.emoji, node.label, unlocked, note))
            else:
                unlocked, total = node.tally(unlocked_names)
                rows.append((depth - 1, "🎨", f"{node.label} Tier", True, f"{unlocked}/{total} unlocked (incl. sub-tiers)"))
        return rows

    def render(self):
        unlocked, total = self.root.tally(self.unlocked_names())
        renderPlantBook(self.rows(), unlocked, total)

    def print_levels(self):
        lines = []
        for depth, level in enumerate(self.root.level_order()):
            labels = [node.label for node in level]
            lines.append(f"Level {depth}: " + ", ".join(labels))
        print("Plant Book, level by level:\\n" + "\\n".join(lines) + "\\n")


plant_book = PlantBook(game)
plant_book.render()
plant_book.print_levels()

unlocked, total = plant_book.root.tally(plant_book.unlocked_names())
print(f"Plant Book ready! {unlocked} of {total} plants unlocked. Open the Plant Book tab to see it.")
`
  },
  5: {
    title: "Binary Search Trees (BST) & Node Mutation",
    code: `# Topic 5: Binary Search Trees (BST) & Node Mutation
#
# A BST is a binary tree with ONE rule: at every node, everything in its LEFT
# subtree is smaller, everything in its RIGHT subtree is larger (or equal, here -
# see the tie-breaking note below). That one rule is what makes all three
# traversals below do something genuinely useful, not just "visit every node":
#
#   - Inorder   (left, node, right)  -> visits nodes in ASCENDING cost order.
#                                        This is the BST's whole point: sorting
#                                        falls out of the shape for free.
#   - Preorder  (node, left, right)  -> visits a node BEFORE its subtrees. Replaying
#                                        inserts in this exact order rebuilds the
#                                        identical tree shape - it's a backup sequence.
#   - Postorder (left, right, node)  -> visits a node AFTER its subtrees. This is the
#                                        safe order to tear a tree down: you only ever
#                                        discard a node once both its children are gone.
#
# Average time: O(log n) for insert/search, because each comparison discards
# one whole subtree. WORST CASE: O(n), if the tree degenerates into a straight
# chain - watch for this below, it happens almost immediately with our own data.

if "game" not in globals():
    raise RuntimeError("Run the earlier topics first (Topic 3 sets up PLANT_DATA and the garden). Missing: game")


class PriceNode:
    def __init__(self, cost, name):
        self.cost = cost
        self.name = name
        self.left = None
        self.right = None


class PlantPriceBST:
    """Every unlocked plant, ordered by cost. Ties (two plants at the same cost)
    chain off to the right, so the tree is biased toward the RIGHT when many
    plants share a price - which our own starters do, see below."""

    def __init__(self):
        self.root = None

    def insert(self, cost, name):   # O(log n) average, O(n) worst case
        self.root = self._insert(self.root, cost, name)

    def _insert(self, node, cost, name):
        if node is None:
            return PriceNode(cost, name)
        if cost < node.cost:
            node.left = self._insert(node.left, cost, name)
        else:   # cost >= node.cost: equal costs go right, so no plant is ever lost
            node.right = self._insert(node.right, cost, name)
        return node

    def inorder(self):   # O(n): left, node, right
        result = []
        self._inorder(self.root, result)
        return result

    def _inorder(self, node, result):
        if node is None:
            return
        self._inorder(node.left, result)
        result.append(node)
        self._inorder(node.right, result)

    def preorder(self):   # O(n): node, left, right
        result = []
        self._preorder(self.root, result)
        return result

    def _preorder(self, node, result):
        if node is None:
            return
        result.append(node)
        self._preorder(node.left, result)
        self._preorder(node.right, result)

    def postorder(self):   # O(n): left, right, node
        result = []
        self._postorder(self.root, result)
        return result

    def _postorder(self, node, result):
        if node is None:
            return
        self._postorder(node.left, result)
        self._postorder(node.right, result)
        result.append(node)

    def height(self):   # O(n): how many levels deep the tree actually is
        return self._height(self.root)

    def _height(self, node):
        if node is None:
            return 0
        return 1 + max(self._height(node.left), self._height(node.right))


def _rebuild_price_bst():
    tree = PlantPriceBST()
    for plant in game.catalog:   # inserted in catalog order: unlock order, not sorted order
        tree.insert(plant.cost, plant.name)
    return tree


price_bst = _rebuild_price_bst()

inorder_nodes = price_bst.inorder()
preorder_nodes = price_bst.preorder()
postorder_nodes = price_bst.postorder()

# Inorder does real work here: the Seed Bag dropdown is re-sorted cheapest-first,
# straight from the traversal result - no separate sorting logic needed.
addPlantsToDropdown([(n.name, PLANT_DATA[n.name]["emoji"], n.cost) for n in inorder_nodes])

print(f"Plant Price BST ready: {len(inorder_nodes)} plants, tree height {price_bst.height()}.\\n")

print("INORDER (ascending by cost - this is the new Seed Bag order):")
print("  " + " -> ".join(f"{n.name}({n.cost}c)" for n in inorder_nodes) + "\\n")

print("PREORDER (backup sequence - replay these inserts to rebuild the exact same tree):")
print("  " + " -> ".join(f"{n.name}({n.cost}c)" for n in preorder_nodes) + "\\n")

print("POSTORDER (safe teardown order - children cleared before their parent):")
print("  " + " -> ".join(f"{n.name}({n.cost}c)" for n in postorder_nodes) + "\\n")

ideal_height = len(inorder_nodes).bit_length()   # roughly log2(n) + 1, a balanced tree's height
if price_bst.height() > ideal_height + 1:
    print(f"Note: tree height is {price_bst.height()}, but a balanced tree holding "
          f"{len(inorder_nodes)} plants would only need about {ideal_height}. Several of our "
          f"plants START at the same cost (the three starters are all 20c!), and ties always "
          f"go right here, so the tree is leaning into a chain rather than staying bushy. "
          f"That's the real-world case for self-balancing trees (AVL, Red-Black) - out of "
          f"scope for this topic, but this is exactly the problem they solve.")
`
  },
  6: {
    title: "Hash Tables, Collisions, & Rehashing",
    code: `# Topic 6: Hash Tables, Collisions, & Rehashing
# ==== WRITE YOUR CODE HERE ====
`
  },
  7: {
    title: "Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS",
    code: `# Topic 7: Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS
# ==== WRITE YOUR CODE HERE ====
`
  },
  8: {
    title: "Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)",
    code: `# Topic 8: Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)
# ==== WRITE YOUR CODE HERE ====
`
  },
  9: {
    title: "Searching Algorithms (Linear Search vs. Binary Search)",
    code: `# Topic 9: Searching Algorithms (Linear Search vs. Binary Search)
# ==== WRITE YOUR CODE HERE ====
`
  },
  10: {
    title: "Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)",
    code: `# Topic 10: Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)
# ==== WRITE YOUR CODE HERE ====
`
  },
  11: {
    title: "Dynamic Programming (DP), Memoization, & Divide-and-Conquer",
    code: `# Topic 11: Dynamic Programming (DP), Memoization, & Divide-and-Conquer
# ==== WRITE YOUR CODE HERE ====
`
  }
};

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
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement("div");
    const entry = gardenPlants[i];
    const mature = entry && entry.stage === "mature";
    cell.className = "aspect-square rounded-md flex items-center justify-center text-base border cursor-pointer transition-colors select-none " +
      (mature ? "bg-[#2a3825] border-emerald-600 hover:border-emerald-400" : entry ? "bg-[#232f1f] border-emerald-900 hover:border-emerald-500" : "bg-[#2a3825] border-emerald-800 hover:border-emerald-400");
    cell.textContent = entry ? (entry.stage === "mature" ? (plantEmoji[entry.name] || "🌱") : STAGE_ICON[entry.stage] || "🌱") : "⬜";
    if (entry) cell.title = `${entry.name} (${entry.stage})`;
    // 5 tiles per row: flat position i  <->  (row, col)
    cell.addEventListener("click", () => handleTileClick(Math.floor(i / 10), i % 10));
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
function updateResources(water, seeds, energy, hope, coins) {
  if (typeof water === "object" && water !== null) {
    const args = water;
    water  = args.water  !== undefined ? args.water  : 0;
    seeds  = args.seeds  !== undefined ? args.seeds  : 0;
    energy = args.energy !== undefined ? args.energy : 0;
    hope   = args.hope   !== undefined ? args.hope   : 0;
    coins  = args.coins  !== undefined ? args.coins  : 0;
  } else {
    water  = water  !== undefined ? water  : 0;
    seeds  = seeds  !== undefined ? seeds  : 0;
    energy = energy !== undefined ? energy : 0;
    hope   = hope   !== undefined ? hope   : 0;
    coins  = coins  !== undefined ? coins  : 0;
  }

  const waterMax = 200, seedsMax = 100, energyMax = 120, hopeMax = 100;

  document.getElementById("water-text").innerText = `${water} / ${waterMax} L`;
  document.getElementById("water-bar").style.width = `${Math.min(100, (water / waterMax) * 100)}%`;

  document.getElementById("seeds-text").innerText = `${seeds} / ${seedsMax}`;
  document.getElementById("seeds-bar").style.width = `${Math.min(100, (seeds / seedsMax) * 100)}%`;

  document.getElementById("energy-text").innerText = `${energy} / ${energyMax} Wh`;
  document.getElementById("energy-bar").style.width = `${Math.min(100, (energy / energyMax) * 100)}%`;

  document.getElementById("hope-text").innerText = `${hope} / ${hopeMax}`;
  document.getElementById("hope-bar").style.width = `${Math.min(100, (hope / hopeMax) * 100)}%`;

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
    div.textContent = `→ ${act}`;
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
  document.getElementById("code-editor").value = topicTemplates[key].code;
}

function switchTab(tab) {
  ["game", "code", "book", "inventory"].forEach(name => {
    const button = document.getElementById("tab-" + name);
    document.getElementById("view-" + name).classList.toggle("hidden", tab !== name);
    button.classList.toggle("bg-[#283623]", tab === name);
    button.classList.toggle("text-emerald-100", tab === name);
    button.classList.toggle("text-emerald-400/80", tab !== name);
  });
}

window.onload = () => {
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
  loadTopic();
  switchTab("game");

  // Pre-load Pyodide in the background so the first Run is faster
  initPyodide().catch(() => {});
};