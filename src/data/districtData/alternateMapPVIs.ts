/**
 * Canonical re-export of whichever alternate map type is currently active.
 *
 * To switch the active alternative, change the import below:
 *   - proportionalMapSafeSeats  from './proportional/proportionalMapPVIs'  [ACTIVE]
 *   - competitiveMapSafeSeats   from './competitive/competitiveMapPVIs'
 *   - compactMapSafeSeats       from './compact/compactMapPVIs'
 */
import { proportionalMapSafeSeats } from './proportional/proportionalMapPVIs';

export const alternateMapSafeSeats = proportionalMapSafeSeats;
