export const GameModeRegistry = {
  singlePlayerAI: {
    id: 'singlePlayerAI',
    label: 'Single Player vs AI',
    transport: 'localAI',
    enabledByDefault: true
  },
  roomCodeMultiplayer: {
    id: 'roomCodeMultiplayer',
    label: 'Room Code Multiplayer',
    transport: 'websocketRoom',
    enabledByDefault: false
  },
  randomMatchmaking: {
    id: 'randomMatchmaking',
    label: 'Random Online Matchmaking',
    transport: 'websocketMatchmaking',
    enabledByDefault: false
  }
};

export const TransportAdapter = {
  localAI: 'localAI',
  websocketRoom: 'websocketRoom',
  websocketMatchmaking: 'websocketMatchmaking'
};
