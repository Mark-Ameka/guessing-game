export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isImpostor: boolean;
  hasAnswered: boolean;
  score: number;
  vote?: string; // player id they voted for
}

export interface GameSettings {
  categories: string[];
  rotations: number;
  sets: number;
}

export interface Message {
  playerId: string;
  playerNickname: string;
  text: string;
  timestamp: number;
  rotation: number;
}

export interface Room {
  id: string;
  players: Player[];
  settings: GameSettings;
  gameState: GameState;
  currentWord: string;
  currentSet: number;
  currentRotation: number;
  currentTurnIndex: number;
  messages: Message[];
  votingResults?: VotingResult[];
  impostorId?: string;
  turnStartTime?: number;
  phase: GamePhase;
}

export type GamePhase =
  | "lobby"
  | "playing"
  | "voting"
  | "results"
  | "set-transition";

export type GameState = "waiting" | "started" | "finished";

export interface VotingResult {
  voterId: string;
  voterNickname: string;
  votedForId: string;
  votedForNickname: string;
}

export interface RoundResult {
  impostorId: string;
  impostorNickname: string;
  correctVoters: string[];
  scores: Record<string, number>;
}

// WebSocket Events
export enum SocketEvents {
  // Client -> Server
  CREATE_ROOM = "create_room",
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  KICK_PLAYER = "kick_player",
  UPDATE_SETTINGS = "update_settings",
  START_GAME = "start_game",
  SUBMIT_ANSWER = "submit_answer",
  SUBMIT_VOTE = "submit_vote",
  NEXT_SET = "next_set",

  // Server -> Client
  ROOM_CREATED = "room_created",
  ROOM_JOINED = "room_joined",
  ROOM_UPDATED = "room_updated",
  PLAYER_JOINED = "player_joined",
  PLAYER_LEFT = "player_left",
  PLAYER_KICKED = "player_kicked",
  GAME_STARTED = "game_started",
  TURN_STARTED = "turn_started",
  ANSWER_SUBMITTED = "answer_submitted",
  TURN_TIMEOUT = "turn_timeout",
  ROTATION_COMPLETE = "rotation_complete",
  VOTING_PHASE = "voting_phase",
  VOTE_SUBMITTED = "vote_submitted",
  ROUND_RESULTS = "round_results",
  SET_COMPLETE = "set_complete",
  GAME_COMPLETE = "game_complete",
  ERROR = "error",
}

export interface CreateRoomPayload {
  nickname: string;
}

export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
}

export interface UpdateSettingsPayload {
  roomId: string;
  settings: GameSettings;
}

export interface StartGamePayload {
  roomId: string;
}

export interface SubmitAnswerPayload {
  roomId: string;
  playerId: string;
  answer: string;
}

export interface SubmitVotePayload {
  roomId: string;
  playerId: string;
  votedForId: string;
}

export interface NextSetPayload {
  roomId: string;
}

export interface KickPlayerPayload {
  roomId: string;
  playerId: string;
}

export interface ErrorPayload {
  message: string;
}
