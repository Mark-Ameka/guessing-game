import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="/results/:roomId" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
