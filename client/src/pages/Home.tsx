import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gamepad2, Users, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-white">Pyroball</h1>
            <span className="text-sm text-slate-400">Multiplayer</span>
          </div>
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/lobby")}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Enter Lobby
            </Button>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Real-Time <span className="text-orange-500">Multiplayer</span> Basketball
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Challenge players worldwide in fast-paced futsal action. Create rooms, join matches, and climb the rankings.
          </p>
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/lobby")}
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6"
            >
              <Gamepad2 className="w-5 h-5 mr-2" />
              Play Now
            </Button>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6"
            >
              Get Started
            </Button>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Real-Time Multiplayer</h3>
            <p className="text-slate-400">
              Play with friends or challenge random opponents in instant matches with WebSocket networking.
            </p>
          </Card>

          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Server-Authoritative</h3>
            <p className="text-slate-400">
              Fair play guaranteed with server-side validation. No cheating, no exploits—pure competitive skill.
            </p>
          </Card>

          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smooth Gameplay</h3>
            <p className="text-slate-400">
              Client-side prediction and interpolation deliver responsive gameplay even with network latency.
            </p>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">How to Play</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                1
              </div>
              <h4 className="font-bold text-white mb-2">Create or Join</h4>
              <p className="text-slate-400 text-sm">Create a new room or join an existing one with a room code.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                2
              </div>
              <h4 className="font-bold text-white mb-2">Pick Your Team</h4>
              <p className="text-slate-400 text-sm">Choose your team and difficulty level before the match starts.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                3
              </div>
              <h4 className="font-bold text-white mb-2">Play & Compete</h4>
              <p className="text-slate-400 text-sm">Use combos, master timing, and outsmart your opponents.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                4
              </div>
              <h4 className="font-bold text-white mb-2">Climb Rankings</h4>
              <p className="text-slate-400 text-sm">Win matches and track your stats on the global leaderboard.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/lobby")}
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6"
            >
              <Gamepad2 className="w-5 h-5 mr-2" />
              Jump Into Multiplayer
            </Button>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6"
            >
              Sign In to Play
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-900/50 mt-20 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>Pyroball Multiplayer • Real-time competitive futsal • Server-authoritative gameplay</p>
        </div>
      </div>
    </div>
  );
}
