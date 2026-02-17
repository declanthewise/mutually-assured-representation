/**
 * Canonical re-export of whichever alternate map type is currently active.
 *
 * To switch the active alternative, change the import below:
 *   - proportionalMapSafeSeats  from './proportional/proportionalMapLeans'  [ACTIVE]
 *   - competitiveMapSafeSeats   from './competitive/competitiveMapLeans'
 *   - compactMapSafeSeats       from './compact/compactMapLeans'
 */
import { proportionalMapSafeSeats } from './proportional/proportionalMapLeans';

export const alternateMapSafeSeats = proportionalMapSafeSeats;
