import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { socketService } from "../services/socket";
import { useGameStore } from "../stores/gameStore";
import { SocketEvents } from "../types";
import { Trophy, Target, ArrowRight, Clock } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";

export default function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    room,
    playerId,
    lastResults,
    setRoom,
    setRoomId,
    setLastResults,
    setCurrentWord,
    setIsImpostor,
    reset,
  } = useGameStore();

  const [results, setResults] = useState<any>(lastResults);
  const [gameComplete, setGameComplete] = useState(false);
  const [finalWinner, setFinalWinner] = useState<any>(null);
  const [autoNextTimer, setAutoNextTimer] = useState<number>(60);
  const [isCreatingNewRoom, setIsCreatingNewRoom] = useState(false);

  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = room?.players.find((p) => p.id === playerId)?.isHost;

  useEffect(() => {
    if (lastResults && !results) {
      setResults(lastResults);
    }

    if (!playerId || !roomId) {
      navigate("/");
      return;
    }

    if (room && room.currentSet + 1 > room.settings.sets) {
      setGameComplete(true);
    }

    socketService.on(SocketEvents.ROUND_RESULTS, (data) => {
      setResults(data);
      setLastResults(data);
    });

    socketService.on(SocketEvents.SET_COMPLETE, ({ autoNextIn }) => {
      setAutoNextTimer(autoNextIn);

      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
      }

      autoTimerRef.current = setInterval(() => {
        setAutoNextTimer((prev) => {
          if (prev <= 1) {
            if (autoTimerRef.current) {
              clearInterval(autoTimerRef.current);
              autoTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socketService.on(SocketEvents.GAME_COMPLETE, (data) => {
      setGameComplete(true);
      setFinalWinner(data.winner);
    });

    socketService.on(SocketEvents.GAME_STARTED, ({ word, players }) => {
      const me = players.find((p: any) => p.id === playerId);
      if (me) {
        setIsImpostor(me.isImpostor);
        if (!me.isImpostor) {
          setCurrentWord(word);
        } else {
          setCurrentWord(null);
        }
      }
      setLastResults(null);
    });

    socketService.on(SocketEvents.ROOM_UPDATED, ({ room: updatedRoom }) => {
      setRoom(updatedRoom);

      if (updatedRoom.phase === "playing") {
        navigate(`/game/${roomId}`);
      }
    });

    socketService.on(
      SocketEvents.ROOM_CREATED,
      ({ roomId: newRoomId, room: newRoom }) => {
        setRoomId(newRoomId);
        setRoom(newRoom);
        setIsCreatingNewRoom(false);
        navigate(`/lobby/${newRoomId}`);
      },
    );

    // FIX #3: Handle being kicked from results screen
    socketService.on(SocketEvents.PLAYER_KICKED, ({ message }) => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }

      reset();
      alert(message);
      navigate("/");
    });

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }

      socketService.off(SocketEvents.ROUND_RESULTS);
      socketService.off(SocketEvents.SET_COMPLETE);
      socketService.off(SocketEvents.GAME_COMPLETE);
      socketService.off(SocketEvents.GAME_STARTED);
      socketService.off(SocketEvents.ROOM_UPDATED);
      socketService.off(SocketEvents.ROOM_CREATED);
      socketService.off(SocketEvents.PLAYER_KICKED);
    };
  }, [
    room,
    playerId,
    roomId,
    navigate,
    setRoom,
    setRoomId,
    lastResults,
    results,
    setLastResults,
    setCurrentWord,
    setIsImpostor,
    reset,
  ]);

  const handleNextSet = () => {
    if (!roomId) return;
    socketService.nextSet(roomId);
  };

  const handlePlayAgain = () => {
    if (!roomId || !room) return;
    setIsCreatingNewRoom(true);
    socketService.emit("play_again", { roomId });
  };

  const handleBackToLobby = () => {
    if (!roomId || !room) return;
    socketService.backToLobby(roomId);
  };

  // FIX #2: Properly clear everything when leaving
  const handleLeaveGame = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (roomId) {
      socketService.leaveRoom(roomId);
    }

    // Clear Zustand store
    reset();

    // Clear localStorage
    localStorage.removeItem("game-storage");

    // Navigate to home
    navigate("/");
  };

  if (!room || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  const impostorWon = results.correctVoters.length === 0;
  const iWasImpostor = results.impostorId === playerId;
  const iVotedCorrectly = results.correctVoters.includes(playerId);
  const isLastSet = room.currentSet + 1 > room.settings.sets;

  return (
    <div className="min-h-screen p-4 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Result */}
        <Card className="border-2">
          <CardHeader className="text-center pb-3">
            <div className="flex justify-center mb-2">
              {impostorWon ? (
                <Target className="h-12 w-12 text-red-600" />
              ) : (
                <Trophy className="h-12 w-12 text-yellow-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {impostorWon ? "Impostor Wins!" : "Impostor Caught!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                The impostor was
              </p>
              <p className="text-xl font-bold">{results.impostorNickname}</p>
            </div>

            {/* FIX #4: Correct badge logic */}
            {iWasImpostor && (
              <Badge
                variant={impostorWon ? "default" : "destructive"}
                className="text-sm py-1"
              >
                {impostorWon
                  ? `🎉 You fooled them! +2000 pts`
                  : "😔 You were caught!"}
              </Badge>
            )}

            {!iWasImpostor && (
              <Badge
                variant={iVotedCorrectly ? "default" : "secondary"}
                className="text-sm py-1"
              >
                {iVotedCorrectly
                  ? `✅ You guessed correctly! +1000 pts`
                  : "❌ Wrong guess"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Voting Results */}
        <Card>
          <CardHeader>
            <CardTitle>Voting Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.votingResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No votes were cast
              </p>
            ) : (
              results.votingResults.map((vote: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {vote.voterNickname.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{vote.voterNickname}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {vote.votedForNickname.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{vote.votedForNickname}</span>
                    {vote.votedForId === results.impostorId && (
                      <Badge variant="default" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.leaderboard.map((player: any, idx: number) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === 0
                      ? "bg-yellow-50 border-2 border-yellow-200"
                      : "border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <Avatar>
                      <AvatarFallback>
                        {player.nickname.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{player.nickname}</p>
                      {player.id === playerId && (
                        <Badge variant="secondary" className="text-xs h-4">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{player.score}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat visible during results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Game Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-100 pr-4">
              <div className="space-y-3">
                {room.messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages
                  </p>
                ) : (
                  room.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.playerId === playerId
                          ? "bg-black text-white ml-8"
                          : "bg-gray-100 mr-8"
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        {msg.playerNickname}
                      </p>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            {isLastSet || gameComplete ? (
              <div className="space-y-4">
                <div className="text-center p-6 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <Trophy className="h-16 w-16 mx-auto mb-3 text-yellow-600" />
                  <p className="text-2xl font-bold mb-1">Game Complete!</p>
                  <p className="text-lg">
                    Winner:{" "}
                    <span className="font-bold">
                      {finalWinner?.nickname ||
                        results.leaderboard[0]?.nickname}
                    </span>
                  </p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {finalWinner?.score || results.leaderboard[0]?.score} points
                  </p>
                </div>
                {isHost ? (
                  <>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handlePlayAgain}
                      disabled={isCreatingNewRoom}
                    >
                      {isCreatingNewRoom
                        ? "Creating New Room..."
                        : "Play Again with Same Players"}
                    </Button>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleBackToLobby}
                    >
                      Back to Lobby with Same Players
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Waiting for host to start a new game...
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isHost ? (
                  <>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleNextSet}
                    >
                      Start Next Set ({room.currentSet + 1}/{room.settings.sets}
                      )
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Auto-starting in {autoNextTimer}s</span>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleBackToLobby}
                    >
                      Back to Lobby with Same Players
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground py-4">
                      Waiting for host to start the next set...
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Auto-starting in {autoNextTimer}s</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave Game Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              className="w-full"
              size="lg"
              variant="destructive"
              onClick={handleLeaveGame}
            >
              Leave Game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
