import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Plus, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Lobby() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [difficulty, setDifficulty] = useState<"rookie" | "pro" | "allstar">("pro");
  const [joinCode, setJoinCode] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Fetch available rooms
  const { data: availableRooms, isLoading: roomsLoading, refetch } = trpc.rooms.list.useQuery();

  // Create room mutation
  const createRoomMutation = trpc.rooms.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Room created! Code: ${data.roomCode}`);
      setShowCreateRoom(false);
      setDifficulty("pro");
      refetch();
      // Navigate to the room
      setLocation(`/multiplayer/${data.roomCode}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create room");
    },
  });

  // Join room mutation
  const joinRoomMutation = trpc.rooms.join.useMutation({
    onSuccess: (data) => {
      toast.success("Joined room!");
      setJoinCode("");
      // Navigate to the room
      setLocation(`/multiplayer/${data.room.roomCode}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to join room");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Pyroball Multiplayer</h1>
          <p className="text-slate-400 mb-6">Sign in to play with friends</p>
          <Button
            onClick={() => window.location.href = "/api/oauth/login"}
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Pyroball Multiplayer</h1>
            <p className="text-slate-400">Welcome, {user?.name || "Player"}!</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              setLocation("/");
            }}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create/Join Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Start Playing</h2>

            {!showCreateRoom ? (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowCreateRoom(true)}
                  className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
                  size="lg"
                >
                  <Plus className="w-5 h-5" />
                  Create Room
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-800 text-slate-400">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Enter room code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="bg-slate-700 border-slate-600 text-white"
                    maxLength={8}
                  />
                  <Button
                    onClick={() => joinCode && joinRoomMutation.mutate({ roomCode: joinCode })}
                    disabled={!joinCode || joinRoomMutation.isPending}
                    className="w-full"
                  >
                    {joinRoomMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Joining...
                      </>
                    ) : (
                      "Join Room"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Difficulty</label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="rookie">Rookie</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="allstar">All-Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => createRoomMutation.mutate({ difficulty })}
                    disabled={createRoomMutation.isPending}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {createRoomMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowCreateRoom(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Available Rooms */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Rooms
            </h2>

            {roomsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : !availableRooms || availableRooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No rooms available</p>
                <p className="text-slate-500 text-sm mt-2">Create one to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.roomCode)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedRoom === room.roomCode
                        ? "border-orange-500 bg-slate-700"
                        : "border-slate-600 bg-slate-700/50 hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-white text-lg">{room.roomCode}</p>
                        <p className="text-sm text-slate-400 capitalize">
                          {room.difficulty} • Created {new Date(room.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          joinRoomMutation.mutate({ roomCode: room.roomCode });
                        }}
                        disabled={joinRoomMutation.isPending}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {joinRoomMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Join"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
