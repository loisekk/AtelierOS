// Barrel — one file per room under rooms/. Keeps RoomFurnisher's import stable.
// This file must contain NOTHING but re-exports. All room code lives in rooms/.
export { homeWorkspace } from './rooms/homeWorkspace';
export { brainChamber } from './rooms/brainChamber';
export { showcase } from './rooms/showcase';
export { agentSpace } from './rooms/agentSpace';
export { commandHub } from './rooms/commandHub';
export { officeFloor } from './rooms/officeFloor';
export { knowledgeHub } from './rooms/knowledgeHub';
export { meetingRoom } from './rooms/meetingRoom';
export { aiClub } from './rooms/aiClub';
export { reception } from './rooms/reception';