// client/src/pages/Results.tsx
import { useEffect, useState } from "react";
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
  } = useGameStore();

  const [results, setResults] = useState<any>(lastResults);
  const [gameComplete, setGameComplete] = useState(false);
  const [finalWinner, setFinalWinner] = useState<any>(null);
  const [autoNextTimer, setAutoNextTimer] = useState<number>(60);
  const [isCreatingNewRoom, setIsCreatingNewRoom] = useState(false);

  const isHost = room?.players.find((p) => p.id === playerId)?.isHost;

  useEffect(() => {
    // Load results from Zustand store immediately
    if (lastResults && !results) {
      setResults(lastResults);
    }

    if (!playerId || !roomId) {
      navigate("/");
      return;
    }

    // Check if this is the final set immediately
    // If the next set would exceed total sets, this is the last set
    if (room && room.currentSet + 1 > room.settings.sets) {
      setGameComplete(true);
    }

    socketService.on(SocketEvents.ROUND_RESULTS, (data) => {
      setResults(data);
      setLastResults(data);
    });

    socketService.on(SocketEvents.SET_COMPLETE, ({ autoNextIn }) => {
      setAutoNextTimer(autoNextIn);

      const interval = setInterval(() => {
        setAutoNextTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    });

    socketService.on(SocketEvents.GAME_COMPLETE, (data) => {
      setGameComplete(true);
      setFinalWinner(data.winner);
    });

    socketService.on(
      SocketEvents.GAME_STARTED,
      ({ word, players, currentSet }) => {
        console.log(
          "GAME_STARTED received in Results - Set",
          currentSet,
          "Word:",
          word
        );

        // Update player's role for the new set
        const me = players.find((p: any) => p.id === playerId);
        if (me) {
          console.log("Updating player role - isImpostor:", me.isImpostor);
          setIsImpostor(me.isImpostor);
          if (!me.isImpostor) {
            setCurrentWord(word);
          } else {
            setCurrentWord(null);
          }
        }

        // Clear results for the new set
        setLastResults(null);

        // DON'T navigate here - let ROOM_UPDATED handle navigation
        // This prevents race condition where Game.tsx misses the GAME_STARTED event
        console.log(
          "Set",
          currentSet,
          "started - waiting for ROOM_UPDATED to navigate"
        );
      }
    );

    socketService.on(SocketEvents.ROOM_UPDATED, ({ room: updatedRoom }) => {
      console.log("ROOM_UPDATED in Results - phase:", updatedRoom.phase);
      setRoom(updatedRoom);

      // Navigate to game when phase changes to playing (new set started)
      if (updatedRoom.phase === "playing") {
        console.log("Phase is playing - navigating to game");
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
      }
    );

    return () => {
      socketService.off(SocketEvents.ROUND_RESULTS);
      socketService.off(SocketEvents.SET_COMPLETE);
      socketService.off(SocketEvents.GAME_COMPLETE);
      socketService.off(SocketEvents.GAME_STARTED);
      socketService.off(SocketEvents.ROOM_UPDATED);
      socketService.off(SocketEvents.ROOM_CREATED);
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
  ]);

  const handleNextSet = () => {
    if (!roomId) {
      console.error("No roomId available");
      return;
    }

    console.log("Host clicking Start Next Set button, emitting next_set event");
    socketService.nextSet(roomId);
  };

  const handlePlayAgain = () => {
    if (!roomId || !room) return;

    setIsCreatingNewRoom(true);
    socketService.emit("play_again", { roomId });
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

  // Check if this is the last set (game complete)
  // If the next set number would exceed total sets, this is the last set
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

            {iWasImpostor && (
              <Badge
                variant={impostorWon ? "default" : "destructive"}
                className="text-sm py-1"
              >
                {impostorWon
                  ? `🎉 You fooled them! +${2000} pts`
                  : "😔 You were caught!"}
              </Badge>
            )}

            {!iWasImpostor && (
              <Badge
                variant={iVotedCorrectly ? "default" : "secondary"}
                className="text-sm py-1"
              >
                {iVotedCorrectly
                  ? `✅ You guessed correctly! +${1000} pts`
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
                      onClick={() => {
                        console.log("!!! BUTTON CLICKED !!!");
                        console.log(
                          "Current room.currentSet:",
                          room.currentSet
                        );
                        console.log("Room phase:", room.phase);
                        handleNextSet();
                      }}
                    >
                      Start Next Set ({room.currentSet + 1}/{room.settings.sets}
                      )
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Auto-starting in {autoNextTimer}s</span>
                    </div>
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
      </div>
    </div>
  );
}
