import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { socketService } from "../services/socket";
import { useGameStore } from "../stores/gameStore";
import { SocketEvents } from "../types";

export default function Home() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const {
    setPlayerId,
    setPlayerNickname,
    setRoom,
    setRoomId,
    loadFromLocalStorage,
    clearLocalStorage,
  } = useGameStore();

  useEffect(() => {
    // Try to load from localStorage on mount
    const hasData = loadFromLocalStorage();
    const store = useGameStore.getState();

    if (hasData && store.roomId && store.playerId && store.playerNickname) {
      // Attempt to reconnect
      reconnectToRoom(store.roomId, store.playerId, store.playerNickname);
    } else {
      // Clear any stale data
      clearLocalStorage();
    }
  }, []);

  const reconnectToRoom = async (
    roomId: string,
    playerId: string,
    playerNickname: string,
  ) => {
    try {
      await socketService.connect();

      socketService.on(SocketEvents.ROOM_JOINED, ({ room }) => {
        setRoom(room);

        // Navigate based on game phase
        if (room.phase === "lobby") {
          navigate(`/lobby/${roomId}`);
        } else if (room.phase === "playing" || room.phase === "voting") {
          navigate(`/game/${roomId}`);
        } else if (
          room.phase === "results" ||
          room.phase === "set-transition"
        ) {
          navigate(`/results/${roomId}`);
        }
      });

      socketService.on(SocketEvents.ERROR, ({ message }) => {
        console.error("Reconnection failed:", message);
        clearLocalStorage();
      });

      // Use rejoin instead of join
      socketService.rejoinRoom(roomId, playerId, playerNickname);
    } catch (err) {
      console.error("Failed to reconnect:", err);
      clearLocalStorage();
    }
  };

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      await socketService.connect();

      socketService.on(SocketEvents.ROOM_CREATED, ({ roomId, room }) => {
        setPlayerId(socketService.getSocketId()!);
        setPlayerNickname(nickname);
        setRoomId(roomId);
        setRoom(room);
        navigate(`/lobby/${roomId}`);
      });

      socketService.on(SocketEvents.ERROR, ({ message }) => {
        setError(message);
        setIsCreating(false);
      });

      socketService.createRoom(nickname);
    } catch (err) {
      setError("Failed to connect to server");
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      await socketService.connect();

      socketService.on(SocketEvents.ROOM_JOINED, ({ room }) => {
        setPlayerId(socketService.getSocketId()!);
        setPlayerNickname(nickname);
        setRoomId(roomCode.toUpperCase());
        setRoom(room);
        navigate(`/lobby/${roomCode.toUpperCase()}`);
      });

      socketService.on(SocketEvents.ERROR, ({ message }) => {
        setError(message);
        setIsJoining(false);
      });

      socketService.joinRoom(roomCode.toUpperCase(), nickname);
    } catch (err) {
      setError("Failed to connect to server");
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Word Impostor</CardTitle>
          <CardDescription>Guess who doesn't know the word</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nickname">Your Nickname</Label>
            <Input
              id="nickname"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining}
            >
              {isCreating ? "Creating..." : "Create Room"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={handleJoinRoom}
                disabled={isCreating || isJoining}
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Minimum 3 players required</p>
            <p>• Find the impostor who doesn't know the word</p>
            <p>• Take turns describing the word</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
