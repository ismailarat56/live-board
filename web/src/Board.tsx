import { assertNever, CARD_STATUSES, type Card } from "@live-board/shared";
import { useEffect, useReducer, useState } from "react";
import { errorMessage, listCards, moveCard } from "./api.ts";
import { boardReducer, cardsInColumn, initialBoardState } from "./board-state.ts";
import { Column } from "./Column.tsx";
import { moveTarget, type Direction } from "./move-target.ts";
import { NewCardForm } from "./NewCardForm.tsx";
import { useBoardSocket, type SocketStatus } from "./use-board-socket.ts";

interface BoardProps {
  boardId: number;
}

const STATUS_TEXT: Record<SocketStatus, string> = {
  connecting: "Bağlanıyor...",
  open: "Canlı",
  closed: "Bağlantı kesildi",
};

export function Board({ boardId }: BoardProps) {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const [attempt, setAttempt] = useState(0);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [connection, setConnection] = useState(0);

  const socketStatus = useBoardSocket({
    boardId,
    connection,
    onWelcome: () => setAttempt((value) => value + 1),
    onEvent: (event) => dispatch({ type: "eventReceived", event }),
  });

  useEffect(() => {
    let ignore = false;

    listCards(boardId)
      .then((cards) => {
        if (!ignore) {
          dispatch({ type: "loaded", cards });
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          dispatch({ type: "failed", message: errorMessage(error) });
        }
      });

    return () => {
      ignore = true;
    };
  }, [boardId, attempt]);

  function retry() {
    dispatch({ type: "retried" });
    setAttempt((value) => value + 1);
  }

  async function handleMove(cards: readonly Card[], card: Card, direction: Direction) {
    const target = moveTarget(cards, card, direction);

    if (target === null) {
      return;
    }

    setMoving(true);
    setMoveError(null);

    try {
      dispatch({ type: "cardsMoved", cards: await moveCard(card.id, target) });
    } catch (error) {
      setMoveError(errorMessage(error));
    } finally {
      setMoving(false);
    }
  }

  const badge = (
    <p className={`connection connection-${socketStatus}`}>
      {STATUS_TEXT[socketStatus]}
      {socketStatus === "closed" && (
        <button type="button" onClick={() => setConnection((value) => value + 1)}>
          Yeniden bağlan
        </button>
      )}
    </p>
  );

  switch (state.status) {
    case "loading":
      return (
        <>
          {badge}
          <p>Kartlar yükleniyor...</p>
        </>
      );
    case "error":
      return (
        <div role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={retry}>
            Tekrar dene
          </button>
        </div>
      );
    case "ready":
      return (
        <>
          {badge}
          <NewCardForm
            boardId={boardId}
            onCreated={(card) => dispatch({ type: "cardCreated", card })}
          />
          {moveError && (
            <p className="form-error" role="alert">
              {moveError}
            </p>
          )}
          <div className="board">
            {CARD_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                cards={cardsInColumn(state.cards, status)}
                busy={moving}
                canMove={(card, direction) =>
                  moveTarget(state.cards, card, direction) !== null
                }
                onMove={(card, direction) => handleMove(state.cards, card, direction)}
              />
            ))}
          </div>
        </>
      );
    default:
      return assertNever(state);
  }
}
