// client/src/types/index.ts (and server/src/types.ts)
export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isImpostor: boolean;
  hasAnswered: boolean;
  score: number;
  vote?: string;
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
  isPaused?: boolean;
  pausedTimeLeft?: number;
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
  VOTE_IN_ADVANCE = "vote_in_advance",
  NEXT_SET = "next_set",
  PAUSE_GAME = "pause_game",
  RESUME_GAME = "resume_game",
  BACK_TO_LOBBY = "back_to_lobby",

  // Server -> Client
  ROOM_CREATED = "room_created",
  ROOM_JOINED = "room_joined",
  ROOM_UPDATED = "room_updated",
  PLAYER_JOINED = "player_joined",
  PLAYER_LEFT = "player_left",
  PLAYER_KICKED = "player_kicked",
  PLAYER_VOTED_EARLY = "player_voted_early",
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
  GAME_PAUSED = "game_paused",
  GAME_RESUMED = "game_resumed",
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

export interface VoteInAdvancePayload {
  roomId: string;
  playerId: string;
}

export interface NextSetPayload {
  roomId: string;
}

export interface KickPlayerPayload {
  roomId: string;
  playerId: string;
}

export interface PauseGamePayload {
  roomId: string;
  timeLeft: number;
}

export interface ResumeGamePayload {
  roomId: string;
}

export interface BackToLobbyPayload {
  roomId: string;
}

export interface ErrorPayload {
  message: string;
}
