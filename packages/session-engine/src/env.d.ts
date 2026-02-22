/**
 * Ambient declarations for timer globals.
 * These are available in both Node.js and browser environments,
 * but not included in the ES2022 lib without DOM or @types/node.
 */

declare function setInterval(callback: () => void, ms: number): number;
declare function clearInterval(id: number): void;
