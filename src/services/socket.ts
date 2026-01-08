import { io, Socket } from "socket.io-client";
import { SocketEvents } from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        resolve(this.socket!);
      });

      this.socket.on("connect_error", (error) => {
        reject(error);
      });

      this.socket.on("disconnect", () => {
        // Handle disconnect silently
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);

      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(callback);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      } else {
        this.socket.off(event);
        this.listeners.delete(event);
      }
    }
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Game-specific methods
  createRoom(nickname: string) {
    this.emit(SocketEvents.CREATE_ROOM, { nickname });
  }

  joinRoom(roomId: string, nickname: string) {
    this.emit(SocketEvents.JOIN_ROOM, { roomId, nickname });
  }

  rejoinRoom(roomId: string, playerId: string, nickname: string) {
    this.emit("rejoin_room", { roomId, playerId, nickname });
  }

  leaveRoom(roomId: string) {
    this.emit(SocketEvents.LEAVE_ROOM, { roomId });
  }

  kickPlayer(roomId: string, playerId: string) {
    this.emit(SocketEvents.KICK_PLAYER, { roomId, playerId });
  }

  updateSettings(roomId: string, settings: any) {
    this.emit(SocketEvents.UPDATE_SETTINGS, { roomId, settings });
  }

  startGame(roomId: string) {
    this.emit(SocketEvents.START_GAME, { roomId });
  }

  submitAnswer(roomId: string, playerId: string, answer: string) {
    this.emit(SocketEvents.SUBMIT_ANSWER, { roomId, playerId, answer });
  }

  submitVote(roomId: string, playerId: string, votedForId: string) {
    this.emit(SocketEvents.SUBMIT_VOTE, { roomId, playerId, votedForId });
  }

  nextSet(roomId: string) {
    this.emit(SocketEvents.NEXT_SET, { roomId });
  }
}

export const socketService = new SocketService();
