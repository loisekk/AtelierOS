/** 2D camera persistence across Phaser game remounts — fixes the standing
 *  14.6 punch-list quirk ("camera resets to fit on every 2D remount").
 *  zoom 0 = never persisted → first mount fits the sheet. */
export const persist = { x: 0, z: 0, zoom: 0 };