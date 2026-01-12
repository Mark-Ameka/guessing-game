import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { socketService } from "../services/socket";
import { useGameStore } from "../stores/gameStore";
import { SocketEvents } from "../types";
import { Send, Clock, Crown, Eye, EyeOff, Pause, Play, X } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    room,
    playerId,
    currentWord,
    isImpostor,
    setRoom,
    addMessage,
    setLastResults,
    reset,
  } = useGameStore();

  const [answer, setAnswer] = useState("");
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingTimeLeft, setVotingTimeLeft] = useState(60);
  const [showVoting, setShowVoting] = useState(false);
  const [earlyVoting, setEarlyVoting] = useState(false);
  const [wordVisible, setWordVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voteNotifications, setVoteNotifications] = useState<string[]>([]);
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const votingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedToResults = useRef(false);

  const isHost = room?.players.find((p) => p.id === playerId)?.isHost;

  useEffect(() => {
    if (!room || !playerId) {
      navigate("/");
      return;
    }

    hasNavigatedToResults.current = false;
    setShowVoting(false);
    setHasVoted(false);
    setSelectedVote(null);
    setEarlyVoting(false);

    socketService.on(SocketEvents.TURN_STARTED, (data) => {
      setCurrentTurn(data);
      setShowVoting(false);
      setTimeLeft(60);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    });

    socketService.on(SocketEvents.GAME_PAUSED, () => {
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    // FIX #1: Properly restart timer when game resumes
    socketService.on(SocketEvents.GAME_RESUMED, ({ timeLeft: resumedTime }) => {
      console.log("Game resumed with timeLeft:", resumedTime);

      // Clear any existing timer first
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Set the time and unpause
      setTimeLeft(resumedTime);
      setIsPaused(false);

      // Use setTimeout to ensure state has updated before starting interval
      setTimeout(() => {
        console.log("Starting interval timer...");
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            const newTime = prev - 1;
            console.log("Timer tick:", newTime);
            if (newTime <= 0) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 0;
            }
            return newTime;
          });
        }, 1000);
      }, 100);
    });

    socketService.on(SocketEvents.ANSWER_SUBMITTED, ({ message }) => {
      addMessage(message);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }, 100);
    });

    socketService.on(SocketEvents.TURN_TIMEOUT, () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socketService.on(SocketEvents.ROTATION_COMPLETE, () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCurrentTurn(null);
    });

    socketService.on(SocketEvents.GAME_STARTED, ({ currentSet }) => {
      setShowVoting(false);
      setHasVoted(false);
      setSelectedVote(null);
      setEarlyVoting(false);
      setCurrentTurn(null);
      setAnswer("");
      setVotedPlayers(new Set());
      setVoteNotifications([]);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      hasNavigatedToResults.current = false;

      if (room) {
        setRoom({
          ...room,
          phase: "playing",
          messages: [],
          currentSet: currentSet,
        });
      }
    });

    socketService.on(SocketEvents.VOTING_PHASE, () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }

      setCurrentTurn(null);
      setShowVoting(true);
      setHasVoted(false);
      setSelectedVote(null);
      setVotingTimeLeft(60);
      setVotedPlayers(new Set());

      votingTimerRef.current = setInterval(() => {
        setVotingTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            if (votingTimerRef.current) {
              clearInterval(votingTimerRef.current);
              votingTimerRef.current = null;
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    });

    socketService.on(SocketEvents.PLAYER_VOTED_EARLY, ({ playerNickname }) => {
      setVoteNotifications((prev) => [
        ...prev,
        `${playerNickname} is voting in advance`,
      ]);
      setTimeout(() => {
        setVoteNotifications((prev) => prev.slice(1));
      }, 3000);
    });

    socketService.on(
      SocketEvents.VOTE_SUBMITTED,
      ({ playerId: voterId, playerNickname }) => {
        if (voterId === playerId) {
          setHasVoted(true);

          if (votingTimerRef.current) {
            clearInterval(votingTimerRef.current);
            votingTimerRef.current = null;
          }
        } else {
          setVoteNotifications((prev) => [
            ...prev,
            `${playerNickname} has voted`,
          ]);
          setTimeout(() => {
            setVoteNotifications((prev) => prev.slice(1));
          }, 3000);
        }

        setVotedPlayers((prev) => new Set([...prev, voterId]));
      },
    );

    socketService.on(SocketEvents.ROUND_RESULTS, (data) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }

      setLastResults(data);

      if (!hasNavigatedToResults.current) {
        hasNavigatedToResults.current = true;
        navigate(`/results/${roomId}`);
      }
    });

    // FIX #3: Handle being kicked from game
    socketService.on(SocketEvents.PLAYER_KICKED, ({ message }) => {
      // Clear all timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }

      // Clear store and navigate
      reset();
      alert(message);
      navigate("/");
    });

    socketService.on(SocketEvents.ROOM_UPDATED, ({ room: updatedRoom }) => {
      setRoom(updatedRoom);

      if (updatedRoom.phase === "voting" && !showVoting) {
        setShowVoting(true);
        setCurrentTurn(null);
      }

      if (updatedRoom.phase === "playing" && showVoting) {
        setShowVoting(false);
        setHasVoted(false);
        setSelectedVote(null);
      }

      if (
        (updatedRoom.phase === "results" ||
          updatedRoom.phase === "set-transition") &&
        !hasNavigatedToResults.current
      ) {
        hasNavigatedToResults.current = true;
        navigate(`/results/${roomId}`);
      }
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }

      socketService.off(SocketEvents.GAME_STARTED);
      socketService.off(SocketEvents.TURN_STARTED);
      socketService.off(SocketEvents.GAME_PAUSED);
      socketService.off(SocketEvents.GAME_RESUMED);
      socketService.off(SocketEvents.ANSWER_SUBMITTED);
      socketService.off(SocketEvents.TURN_TIMEOUT);
      socketService.off(SocketEvents.ROTATION_COMPLETE);
      socketService.off(SocketEvents.VOTING_PHASE);
      socketService.off(SocketEvents.PLAYER_VOTED_EARLY);
      socketService.off(SocketEvents.VOTE_SUBMITTED);
      socketService.off(SocketEvents.ROUND_RESULTS);
      socketService.off(SocketEvents.PLAYER_KICKED);
      socketService.off(SocketEvents.ROOM_UPDATED);
    };
  }, [
    room,
    playerId,
    roomId,
    navigate,
    setRoom,
    addMessage,
    showVoting,
    setLastResults,
    reset,
  ]);

  const handleSubmitAnswer = () => {
    if (!answer.trim() || !roomId || !playerId) return;
    socketService.submitAnswer(roomId, playerId, answer);
    setAnswer("");
  };

  const handleSubmitVote = () => {
    if (!selectedVote || !roomId || !playerId || hasVoted) return;
    if (selectedVote === playerId) return;
    socketService.submitVote(roomId, playerId, selectedVote);
  };

  // FIX #2: Properly clear everything when leaving
  const handleLeaveGame = () => {
    if (roomId) {
      socketService.leaveRoom(roomId);
    }

    // Clear all timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (votingTimerRef.current) {
      clearInterval(votingTimerRef.current);
      votingTimerRef.current = null;
    }

    // Clear Zustand store
    reset();

    // Clear localStorage
    localStorage.removeItem("game-storage");

    // Navigate to home
    navigate("/");
  };

  const handlePauseGame = () => {
    if (!roomId || !isHost) return;
    console.log("Pausing game with timeLeft:", timeLeft);
    socketService.pauseGame(roomId, timeLeft);
  };

  const handleResumeGame = () => {
    if (!roomId || !isHost) return;
    socketService.resumeGame(roomId);
  };

  const handleKickPlayer = (kickPlayerId: string) => {
    if (!roomId || !isHost) return;
    socketService.kickPlayer(roomId, kickPlayerId);
  };

  const handleVoteInAdvance = () => {
    setEarlyVoting(true);
    if (roomId && playerId) {
      socketService.voteInAdvance(roomId, playerId);
    }
  };

  if (!room) return null;

  const isMyTurn = currentTurn?.playerId === playerId;
  const isVotingPhase = showVoting || room.phase === "voting" || earlyVoting;

  return (
    <div className="min-h-screen p-4 bg-white">
      <div className="max-w-4xl mx-auto space-y-4">
        {voteNotifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {voteNotifications.map((notification, idx) => (
              <Alert key={idx} className="w-80 bg-green-50 border-green-200">
                <AlertDescription>{notification}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {isPaused && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <Badge variant="secondary" className="text-lg py-2 px-4">
              Game Paused by Host
            </Badge>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Set {room.currentSet} of {room.settings.sets}
                </CardTitle>
                {!isVotingPhase && currentTurn && (
                  <p className="text-sm text-muted-foreground">
                    Rotation {currentTurn.rotation} of{" "}
                    {currentTurn.totalRotations}
                  </p>
                )}
                {isVotingPhase && (
                  <p className="text-sm text-muted-foreground">Voting Phase</p>
                )}
              </div>
              <div className="text-right">
                {isImpostor ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-xs text-muted-foreground">Your word:</p>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xl font-bold">
                          {wordVisible ? (
                            <Badge variant="destructive" className="text-xs">
                              You're the Impostor
                            </Badge>
                          ) : (
                            "••••••"
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setWordVisible(!wordVisible)}
                      >
                        {wordVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-xs text-muted-foreground">Your word:</p>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xl font-bold">
                          {wordVisible ? currentWord : "••••••"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setWordVisible(!wordVisible)}
                      >
                        {wordVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {isVotingPhase && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Vote for the Impostor
                    {earlyVoting && !showVoting && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Early Voting
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(showVoting || room.phase === "voting") && !hasVoted && (
                      <>
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {votingTimeLeft}s
                        </span>
                      </>
                    )}
                    {hasVoted && (
                      <Badge variant="default" className="text-xs">
                        ✓ Voted
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {room.players
                    .filter((p) => p.id !== playerId)
                    .map((player) => (
                      <Button
                        key={player.id}
                        variant={
                          selectedVote === player.id ? "default" : "outline"
                        }
                        className="h-auto py-3 relative"
                        onClick={() => !hasVoted && setSelectedVote(player.id)}
                        disabled={hasVoted}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {player.nickname.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{player.nickname}</span>
                          {votedPlayers.has(player.id) && (
                            <Badge
                              variant="secondary"
                              className="absolute top-1 right-1 h-4 text-xs"
                            >
                              ✓
                            </Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmitVote}
                  disabled={!selectedVote || hasVoted}
                >
                  {hasVoted ? "Vote Submitted" : "Submit Vote"}
                </Button>
                {hasVoted && (
                  <p className="text-sm text-center text-muted-foreground">
                    Waiting for other players to vote...
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Answers</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-100 pr-4">
                  <div className="space-y-3">
                    {room.messages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No answers yet.
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
          </>
        )}

        {!isVotingPhase && (
          <>
            {currentTurn && (
              <Card className={isMyTurn ? "border-2 border-black" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {currentTurn.playerNickname
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {isMyTurn
                            ? "Your turn!"
                            : `${currentTurn.playerNickname}'s turn`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Turn {currentTurn.turnIndex} of{" "}
                          {currentTurn.totalPlayers}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Clock className="h-5 w-5" />
                      <span>{timeLeft}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Answers</CardTitle>
                  {!earlyVoting && room.messages.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleVoteInAdvance}
                    >
                      Vote in Advance
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {room.messages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No answers yet. Start describing the word!
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
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {isMyTurn && !isPaused && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe the word..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSubmitAnswer()
                      }
                      maxLength={200}
                      autoFocus
                    />
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Players List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm relative group"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {player.nickname.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{player.nickname}</span>
                  {player.isHost && (
                    <Crown className="h-3 w-3 text-yellow-600" />
                  )}
                  {player.id === playerId && (
                    <Badge variant="secondary" className="text-xs h-4 ml-1">
                      You
                    </Badge>
                  )}
                  {isHost && player.id !== playerId && !player.isHost && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 ml-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-opacity"
                      onClick={() => handleKickPlayer(player.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            {isHost && !isVotingPhase && (
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={isPaused ? handleResumeGame : handlePauseGame}
              >
                {isPaused ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resume Game
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Game
                  </>
                )}
              </Button>
            )}
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
