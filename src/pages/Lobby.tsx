import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { socketService } from "../services/socket";
import { useGameStore } from "../stores/gameStore";
import { SocketEvents, GameSettings } from "../types";
import { DEFAULT_CATEGORIES } from "../constants/words";
import { Copy, Check, Crown } from "lucide-react";

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, playerId, setRoom, setCurrentWord, setIsImpostor } =
    useGameStore();

  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    categories: ["Animals", "Food"],
    rotations: 2,
    sets: 1,
  });

  const isHost = room?.players.find((p) => p.id === playerId)?.isHost;

  useEffect(() => {
    if (!room || !playerId) {
      navigate("/");
      return;
    }

    // If already in game, redirect
    if (room.phase !== "lobby") {
      if (room.phase === "playing" || room.phase === "voting") {
        navigate(`/game/${roomId}`);
      } else if (room.phase === "results" || room.phase === "set-transition") {
        navigate(`/results/${roomId}`);
      }
    }

    socketService.on(SocketEvents.PLAYER_JOINED, () => {
      // Player joined handled by ROOM_UPDATED
    });

    socketService.on(SocketEvents.PLAYER_LEFT, () => {
      // Player left handled by ROOM_UPDATED
    });

    socketService.on(SocketEvents.ROOM_UPDATED, ({ room: updatedRoom }) => {
      console.log("Lobby - Room updated:", updatedRoom);
      setRoom(updatedRoom);
      setSettings(updatedRoom.settings);
    });

    socketService.on(SocketEvents.GAME_STARTED, ({ word, players }) => {
      console.log("Lobby - Game started");
      const me = players.find((p: any) => p.id === playerId);
      if (me) {
        setIsImpostor(me.isImpostor);
        if (!me.isImpostor) {
          setCurrentWord(word);
        } else {
          setCurrentWord(null);
        }
      }
      navigate(`/game/${roomId}`);
    });

    socketService.on(SocketEvents.ERROR, ({ message }) => {
      alert(message);
    });

    return () => {
      socketService.off(SocketEvents.PLAYER_JOINED);
      socketService.off(SocketEvents.PLAYER_LEFT);
      socketService.off(SocketEvents.ROOM_UPDATED);
      socketService.off(SocketEvents.GAME_STARTED);
      socketService.off(SocketEvents.ERROR);
    };
  }, [
    room,
    playerId,
    roomId,
    navigate,
    setRoom,
    setCurrentWord,
    setIsImpostor,
  ]);

  const handleCopyRoomCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateSettings = (updates: Partial<GameSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    if (roomId) {
      socketService.updateSettings(roomId, newSettings);
    }
  };

  const handleStartGame = () => {
    if (room && room.players.length < 3) {
      alert("Need at least 3 players to start");
      return;
    }
    if (roomId) {
      socketService.startGame(roomId);
    }
  };

  const toggleCategory = (category: string) => {
    const newCategories = settings.categories.includes(category)
      ? settings.categories.filter((c) => c !== category)
      : [...settings.categories, category];

    if (newCategories.length === 0) return; // Keep at least one
    handleUpdateSettings({ categories: newCategories });
  };

  if (!room) return null;

  return (
    <div className="min-h-screen p-4 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Waiting Room</CardTitle>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-bold tracking-wider">
                  {roomId}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyRoomCode}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Players */}
            <div>
              <Label className="text-base mb-3 block">
                Players ({room.players.length})
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-3 border rounded-lg"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {player.nickname.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium truncate">
                          {player.nickname}
                        </p>
                        {player.isHost && (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        )}
                      </div>
                      {player.id === playerId && (
                        <Badge variant="secondary" className="text-xs h-4">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isHost && (
              <>
                {/* Categories */}
                <div>
                  <Label className="text-base mb-3 block">
                    Word Categories
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_CATEGORIES.map((category) => (
                      <Button
                        key={category}
                        size="sm"
                        variant={
                          settings.categories.includes(category)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rotations">Rotations per Set</Label>
                    <Input
                      id="rotations"
                      type="number"
                      min={1}
                      max={5}
                      value={settings.rotations}
                      onChange={(e) =>
                        handleUpdateSettings({
                          rotations: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Each player answers this many times
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sets">Number of Sets</Label>
                    <Input
                      id="sets"
                      type="number"
                      min={1}
                      max={10}
                      value={settings.sets}
                      onChange={(e) =>
                        handleUpdateSettings({
                          sets: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      New word and impostor each set
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Start Button */}
            {isHost ? (
              <Button
                className="w-full"
                size="lg"
                onClick={handleStartGame}
                disabled={room.players.length < 3}
              >
                {room.players.length < 3
                  ? `Waiting for players... (${room.players.length}/3)`
                  : "Start Game"}
              </Button>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Waiting for host to start the game...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
