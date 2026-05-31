// Ship definitions and ship-level serialization. Pure, no shared state.

export const SHIPS = [
  { id: 0, name: 'Carrier', short: 'CV', cls: 'cv', len: 5 },
  { id: 1, name: 'Battleship', short: 'BB', cls: 'bb', len: 4 },
  { id: 2, name: 'Cruiser', short: 'CA', cls: 'ca', len: 3 },
  { id: 3, name: 'Submarine', short: 'SS', cls: 'ss', len: 3 },
  { id: 4, name: 'Destroyer', short: 'DD', cls: 'dd', len: 2 }
];

export function shipDefinition(id) {
  return SHIPS.find(ship => ship.id === Number(id));
}

export function sanitizeShip(ship, revealCells = false) {
  return {
    id: ship.id,
    name: ship.name,
    short: ship.short,
    cls: ship.cls,
    len: ship.len,
    orient: ship.orient,
    sunk: ship.sunk,
    cells: revealCells ? [...ship.cells] : [],
    hits: [...ship.hits]
  };
}
