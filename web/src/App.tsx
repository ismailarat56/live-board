import { useEffect, useState } from "react";
import { getHealth } from "./api.ts";
import { Board } from "./Board.tsx";

export function App() {
  const [health, setHealth] = useState("bekleniyor");

  useEffect(() => {
    getHealth()
      .then((result) => setHealth(result.status))
      .catch(() => setHealth("ulaşılamıyor"));
  }, []);

  return (
    <main>
      <header>
        <h1>Live Board</h1>
        <p>API: {health}</p>
      </header>
      <Board boardId={1} />
    </main>
  );
}
