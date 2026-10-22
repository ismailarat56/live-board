import { useEffect, useState } from "react";
import { getHealth } from "./api.ts";
import { Board } from "./Board.tsx";
import { loadName, saveName } from "./member-name.ts";
import { NameForm } from "./NameForm.tsx";

export function App() {
  const [health, setHealth] = useState("bekleniyor");
  const [name, setName] = useState(loadName);

  function changeName(next: string) {
    saveName(next);
    setName(next);
  }

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
        <NameForm name={name} onChange={changeName} />
      </header>
      <Board boardId={1} name={name} />
    </main>
  );
}
