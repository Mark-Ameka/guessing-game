// client/src/stores/gameStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Room, Player, Message } from "../types";

interface GameStore {
  // Player state
  playerId: string | null;
  playerNickname: string | null;

  // Room state
  room: Room | null;
  roomId: string | null;

  // Game state
  currentWord: string | null;
  isImpostor: boolean;
  currentTurnPlayerId: string | null;
  turnTimeLeft: number;

  // Results state
  lastResults: any | null;

  // UI state
  isConnected: boolean;
  error: string | null;

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerNickname: (nickname: string) => void;
  setRoom: (room: Room) => void;
  setRoomId: (id: string) => void;
  setCurrentWord: (word: string | null) => void;
  setIsImpostor: (value: boolean) => void;
  setCurrentTurnPlayerId: (id: string | null) => void;
  setTurnTimeLeft: (time: number) => void;
  setIsConnected: (value: boolean) => void;
  setError: (error: string | null) => void;
  setLastResults: (results: any) => void;
  addMessage: (message: Message) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  reset: () => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  clearLocalStorage: () => void;
}

const STORAGE_KEY = "word_impostor_game";

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      playerId: null,
      playerNickname: null,
      room: null,
      roomId: null,
      currentWord: null,
      isImpostor: false,
      currentTurnPlayerId: null,
      turnTimeLeft: 60,
      isConnected: false,
      error: null,
      lastResults: null,

      // Actions
      setPlayerId: (id) => {
        set({ playerId: id });
        get().saveToLocalStorage();
      },

      setPlayerNickname: (nickname) => {
        set({ playerNickname: nickname });
        get().saveToLocalStorage();
      },

      setRoom: (room) => {
        set({ room });
        get().saveToLocalStorage();
      },

      setRoomId: (id) => {
        set({ roomId: id });
        get().saveToLocalStorage();
      },

      setCurrentWord: (word) => set({ currentWord: word }),

      setIsImpostor: (value) => set({ isImpostor: value }),

      setCurrentTurnPlayerId: (id) => set({ currentTurnPlayerId: id }),

      setTurnTimeLeft: (time) => set({ turnTimeLeft: time }),

      setIsConnected: (value) => set({ isConnected: value }),

      setError: (error) => set({ error }),

      setLastResults: (results) => set({ lastResults: results }),

      addMessage: (message) =>
        set((state) => ({
          room: state.room
            ? { ...state.room, messages: [...state.room.messages, message] }
            : null,
        })),

      updatePlayer: (playerId, updates) =>
        set((state) => ({
          room: state.room
            ? {
                ...state.room,
                players: state.room.players.map((p) =>
                  p.id === playerId ? { ...p, ...updates } : p
                ),
              }
            : null,
        })),

      reset: () => {
        set({
          playerId: null,
          playerNickname: null,
          room: null,
          roomId: null,
          currentWord: null,
          isImpostor: false,
          currentTurnPlayerId: null,
          turnTimeLeft: 60,
          error: null,
          lastResults: null,
        });
        get().clearLocalStorage();
      },

      // Persistence methods
      saveToLocalStorage: () => {
        const state = get();

        // Don't persist if in lobby phase - prevents duplicates on reload
        if (state.room?.phase === "lobby") {
          return;
        }

        const dataToSave = {
          playerId: state.playerId,
          playerNickname: state.playerNickname,
          roomId: state.roomId,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
          // Silently fail
        }
      },

      loadFromLocalStorage: () => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const data = JSON.parse(saved);
            set({
              playerId: data.playerId,
              playerNickname: data.playerNickname,
              roomId: data.roomId,
            });
            return true;
          }
        } catch (error) {
          // Silently fail
        }
        return false;
      },

      clearLocalStorage: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          // Silently fail
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        playerId: state.playerId,
        playerNickname: state.playerNickname,
        roomId: state.roomId,
        room: state.room?.phase !== "lobby" ? state.room : null,
      }),
    }
  )
);
