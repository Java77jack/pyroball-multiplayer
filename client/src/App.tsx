import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import GameScreen from "./pages/GameScreen";
import TeamSelect from "./pages/TeamSelect";
import HowToPlay from "./pages/HowToPlay";
import MatchResults from "./pages/MatchResults";
import VSScreen from "./pages/VSScreen";
import Practice from "./pages/Practice";
import PracticeGame from "./pages/PracticeGame";
import Season from "./pages/Season";
import Leaderboard from "./pages/Leaderboard";
import PlayerProfile from "./pages/PlayerProfile";
import { GameProvider } from "./contexts/GameContext";
import { markUserInteraction, preloadMusic } from "./lib/musicEngine";
import { initAudio } from "./lib/soundEngine";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/team-select"} component={TeamSelect} />
      <Route path={"/vs"} component={VSScreen} />
      <Route path={"/game"} component={GameScreen} />
      <Route path={"/how-to-play"} component={HowToPlay} />
      <Route path={"/results"} component={MatchResults} />
      <Route path={"/practice"} component={Practice} />
      <Route path={"/practice-game"} component={PracticeGame} />
      <Route path={"/season"} component={Season} />
      <Route path={"/leaderboard"} component={Leaderboard} />
      <Route path={"/profile/:id"} component={PlayerProfile} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Global interaction listener to unlock audio autoplay policy
  useEffect(() => {
    preloadMusic();

    const handleInteraction = () => {
      initAudio();
      markUserInteraction();
    };

    window.addEventListener('click', handleInteraction, { once: false });
    window.addEventListener('touchstart', handleInteraction, { once: false });
    window.addEventListener('keydown', handleInteraction, { once: false });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <GameProvider>
            <Toaster />
            <Router />
          </GameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
