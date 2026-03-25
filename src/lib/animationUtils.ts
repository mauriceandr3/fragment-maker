export interface CellPosition {
  x: number;        // Grid column
  y: number;        // Grid row
  rectElement: SVGRectElement;
}

export interface CellWithDistance extends CellPosition {
  distance: number; // BFS distance from nearest seed
  waveGroup: number; // Animation batch index
}

// Extract grid position from SVG rect
export function extractCellPositions(
  rects: SVGRectElement[],
  cellWidth: number,
  cellHeight?: number
): CellPosition[] {
  const cw = cellWidth;
  const ch = cellHeight ?? cellWidth;
  return rects.map(rect => ({
    x: Math.round(parseInt(rect.getAttribute('x') || '0') / cw),
    y: Math.round(parseInt(rect.getAttribute('y') || '0') / ch),
    rectElement: rect
  }));
}

// BFS distance calculation (4 directions only)
export function calculateDistanceMap(
  gridCols: number,
  gridRows: number,
  seedCells: CellPosition[],
  targetCells: CellPosition[]
): Map<string, number> {
  const distanceMap = new Map<string, number>();
  const queue: Array<{x: number, y: number, dist: number}> = [];

  // Initialize seeds at distance 0
  seedCells.forEach(seed => {
    distanceMap.set(`${seed.x},${seed.y}`, 0);
    queue.push({x: seed.x, y: seed.y, dist: 0});
  });

  // BFS flood fill (4 directions only)
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [
      {x: current.x - 1, y: current.y},  // left
      {x: current.x + 1, y: current.y},  // right
      {x: current.x, y: current.y - 1},  // up
      {x: current.x, y: current.y + 1},  // down
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= gridCols ||
          neighbor.y < 0 || neighbor.y >= gridRows) continue;

      const key = `${neighbor.x},${neighbor.y}`;
      const isTargetCell = targetCells.some(c => c.x === neighbor.x && c.y === neighbor.y);

      if (isTargetCell && !distanceMap.has(key)) {
        const newDist = current.dist + 1;
        distanceMap.set(key, newDist);
        queue.push({...neighbor, dist: newDist});
      }
    }
  }

  return distanceMap;
}

/**
 * Group cells by their entity ID (data-eid attribute) so all cells in the
 * same elongated entity get the same BFS distance → animate as one unit.
 */
export function applyEntityGrouping(cells: CellWithDistance[]): void {
  const entityGroups = new Map<string, CellWithDistance[]>();

  for (const cell of cells) {
    const eid = cell.rectElement.getAttribute('data-eid');
    if (eid) {
      let group = entityGroups.get(eid);
      if (!group) {
        group = [];
        entityGroups.set(eid, group);
      }
      group.push(cell);
    }
  }

  // All cells in an entity get the minimum distance of the group
  for (const group of entityGroups.values()) {
    const minDist = Math.min(...group.map(c => c.distance));
    for (const cell of group) {
      cell.distance = minDist;
    }
  }
}

// Group cells into animation waves with randomization for organic feel
export function groupIntoWaves(
  cellsWithDistance: CellWithDistance[],
  targetFrames: number
): CellWithDistance[] {
  if (cellsWithDistance.length === 0) return [];

  // Add random tie-breaker to each cell for stable randomization
  const cellsWithTieBreaker = cellsWithDistance.map(cell => ({
    ...cell,
    tieBreaker: Math.random()
  }));

  // Sort by distance first, then by random tie-breaker for same distance
  const sorted = cellsWithTieBreaker.sort((a, b) => {
    const distDiff = a.distance - b.distance;
    if (Math.abs(distDiff) < 0.1) {
      // Same distance level - use stable tie-breaker
      return a.tieBreaker - b.tieBreaker;
    }
    return distDiff;
  });

  // Assign continuous wave values for smoother animation
  // Start from 1 instead of 0 to avoid immediate visibility at progress=0
  return sorted.map((cell, index) => ({
    ...cell,
    waveGroup: ((index + 1) / sorted.length) * targetFrames
  }));
}
