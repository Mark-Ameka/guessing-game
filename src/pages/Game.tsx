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
import { Send, Clock, Crown } from "lucide-react";

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
  } = useGameStore();

  const [answer, setAnswer] = useState("");
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingTimeLeft, setVotingTimeLeft] = useState(60);
  const [showVoting, setShowVoting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedToResults = useRef(false);

  useEffect(() => {
    if (!room || !playerId) {
      navigate("/");
      return;
    }

    // Reset navigation flag when component mounts
    hasNavigatedToResults.current = false;

    // Reset voting state when starting new game/set
    setShowVoting(false);
    setHasVoted(false);
    setSelectedVote(null);

    socketService.on(SocketEvents.TURN_STARTED, (data) => {
      console.log("Turn started:", data);
      setCurrentTurn(data);
      setShowVoting(false);
      setTimeLeft(60);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    });

    socketService.on(SocketEvents.ANSWER_SUBMITTED, ({ message }) => {
      console.log("Answer submitted:", message);
      addMessage(message);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    });

    socketService.on(
      SocketEvents.TURN_TIMEOUT,
      ({ playerId: timeoutPlayerId }) => {
        console.log("Turn timeout:", timeoutPlayerId);
        if (timerRef.current) clearInterval(timerRef.current);
      },
    );

    socketService.on(SocketEvents.ROTATION_COMPLETE, () => {
      console.log("Rotation complete");
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentTurn(null);
    });

    socketService.on(SocketEvents.GAME_STARTED, ({ currentSet }) => {
      console.log("GAME_STARTED received - Starting Set", currentSet);

      // COMPLETE RESET for new set
      setShowVoting(false);
      setHasVoted(false);
      setSelectedVote(null);
      setCurrentTurn(null);
      setAnswer("");

      // Clear any existing timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Reset navigation flag
      hasNavigatedToResults.current = false;

      // Update room with fresh playing phase and cleared messages
      if (room) {
        setRoom({
          ...room,
          phase: "playing",
          messages: [],
          currentSet: currentSet,
        });
      }

      console.log("Game state completely reset for new set");
    });

    socketService.on(SocketEvents.VOTING_PHASE, (data) => {
      console.log("Voting phase event received:", data);
      if (timerRef.current) clearInterval(timerRef.current);

      setCurrentTurn(null);
      setShowVoting(true);
      setHasVoted(false);
      setSelectedVote(null);
      setVotingTimeLeft(60);

      timerRef.current = setInterval(() => {
        setVotingTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    });

    socketService.on(SocketEvents.VOTE_SUBMITTED, ({ playerId: voterId }) => {
      console.log("Vote submitted by:", voterId);
      if (voterId === playerId) {
        setHasVoted(true);
      }
    });

    socketService.on(SocketEvents.ROUND_RESULTS, (data) => {
      console.log("Round results received in Game component:", data);
      if (timerRef.current) clearInterval(timerRef.current);

      // Store results in Zustand store BEFORE navigating
      setLastResults(data);

      // Prevent multiple navigations
      if (!hasNavigatedToResults.current) {
        hasNavigatedToResults.current = true;
        console.log("Navigating to results page with data");
        navigate(`/results/${roomId}`);
      }
    });

    socketService.on(SocketEvents.ROOM_UPDATED, ({ room: updatedRoom }) => {
      console.log("Room updated:", updatedRoom);
      setRoom(updatedRoom);

      // Check if phase changed to voting
      if (updatedRoom.phase === "voting" && !showVoting) {
        console.log("Room phase changed to voting via ROOM_UPDATED");
        setShowVoting(true);
        setCurrentTurn(null);
      }

      // Reset voting when phase changes back to playing
      if (updatedRoom.phase === "playing" && showVoting) {
        console.log("Room phase changed to playing, hiding voting");
        setShowVoting(false);
        setHasVoted(false);
        setSelectedVote(null);
      }

      // Check if phase changed to results
      if (
        (updatedRoom.phase === "results" ||
          updatedRoom.phase === "set-transition") &&
        !hasNavigatedToResults.current
      ) {
        console.log("Room phase changed to results, navigating");
        hasNavigatedToResults.current = true;
        navigate(`/results/${roomId}`);
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socketService.off(SocketEvents.GAME_STARTED);
      socketService.off(SocketEvents.TURN_STARTED);
      socketService.off(SocketEvents.ANSWER_SUBMITTED);
      socketService.off(SocketEvents.TURN_TIMEOUT);
      socketService.off(SocketEvents.ROTATION_COMPLETE);
      socketService.off(SocketEvents.VOTING_PHASE);
      socketService.off(SocketEvents.VOTE_SUBMITTED);
      socketService.off(SocketEvents.ROUND_RESULTS);
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
  ]);

  const handleSubmitAnswer = () => {
    if (!answer.trim() || !roomId || !playerId) return;

    console.log("Submitting answer:", answer);
    socketService.submitAnswer(roomId, playerId, answer);
    setAnswer("");
  };

  const handleSubmitVote = () => {
    if (!selectedVote || !roomId || !playerId || hasVoted) return;

    // Prevent voting for yourself
    if (selectedVote === playerId) {
      console.error("Cannot vote for yourself!");
      return;
    }

    console.log("Submitting vote for:", selectedVote);
    socketService.submitVote(roomId, playerId, selectedVote);
  };

  if (!room) return null;

  const isMyTurn = currentTurn?.playerId === playerId;
  const isVotingPhase = showVoting || room.phase === "voting";

  return (
    <div className="min-h-screen p-4 bg-white">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
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
                  <Badge variant="destructive" className="text-xs">
                    You're the Impostor
                  </Badge>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Your word:</p>
                    <p className="text-xl font-bold">{currentWord}</p>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Voting Phase */}
        {isVotingPhase && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vote for the Impostor</CardTitle>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {votingTimeLeft}s
                  </span>
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
                      className="h-auto py-3"
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
        )}

        {/* Playing Phase */}
        {!isVotingPhase && (
          <>
            {/* Turn Info */}
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

            {/* Messages */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Answers</CardTitle>
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
                          className={`p-3 rounded-lg ${msg.playerId === playerId
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

            {/* Answer Input - Only show when it's my turn */}
            {isMyTurn && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe the word..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyPress={(e) =>
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
                  className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm"
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
