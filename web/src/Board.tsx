import { assertNever, CARD_STATUSES, type Card } from "@live-board/shared";
import { useEffect, useReducer, useState } from "react";
import { deleteCard, errorMessage, isVersionConflict, listCards, moveCard } from "./api.ts";
import { boardReducer, cardsInColumn, initialBoardState } from "./board-state.ts";
import { Column } from "./Column.tsx";
import { MemberList } from "./MemberList.tsx";
import { moveTarget, type Direction } from "./move-target.ts";
import { NewCardForm } from "./NewCardForm.tsx";
import { useBoardSocket, type SocketState } from "./use-board-socket.ts";
import { useMembers } from "./use-members.ts";

interface BoardProps {
  boardId: number;
  name: string;
}

function socketText(state: SocketState): string {
  switch (state.status) {
    case "connecting":
      return "Bağlanıyor...";
    case "open":
      return "Canlı";
    case "waiting":
      return `Bağlantı koptu, ${Math.ceil(state.delayMs / 1000)} sn içinde yeniden denenecek (${state.attempt}. deneme)`;
    default:
      return assertNever(state);
  }
}

export function Board({ boardId, name }: BoardProps) {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const members = useMembers(boardId);
  const refresh = () => setAttempt((value) => value + 1);
  const socket = useBoardSocket({
    boardId,
    name,
    onWelcome: (connectionId) => {
      setMe(connectionId);
      refresh();
      members.refresh();
    },
    onEvent: (event) => {
      if (event.type === "members_changed") {
        members.refresh();
        return;
      }

      dispatch({ type: "eventReceived", event });
    },
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
    refresh();
  }

  async function handleMove(cards: readonly Card[], card: Card, direction: Direction) {
    const target = moveTarget(cards, card, direction);

    if (target === null) {
      return;
    }

    setBusy(true);
    setActionError(null);

    try {
      dispatch({ type: "cardsMoved", cards: await moveCard(card.id, target) });
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(card: Card) {
    setBusy(true);
    setActionError(null);

    try {
      await deleteCard(card.id, card.version);
      dispatch({ type: "cardDeleted", cardId: card.id });
    } catch (error) {
      if (isVersionConflict(error)) {
        setActionError(
          "Kart sen silmeye karar verirken değişti; güncel hali ekranda. Yine de silmek istiyorsan yeniden sil."
        );
        refresh();
      } else {
        setActionError(errorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  }

  const badge = (
    <p className={`connection connection-${socket.state.status}`} role="status">
      {socketText(socket.state)}
      {socket.state.status === "waiting" && (
        <button type="button" onClick={socket.reconnectNow}>
          Şimdi dene
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
          {/* Fragment, fazladan bir DOM elemanı oluşturmadan içeriği gruplar. */}
          {badge}
          {socket.state.status === "open" && <MemberList members={members.members} me={me} />}
          <NewCardForm
            boardId={boardId}
            onCreated={(card) => dispatch({ type: "cardCreated", card })}
          />
          {state.refreshError && (
            <div className="form-error" role="alert">
              <p>Pano yenilenemedi: {state.refreshError}</p>
              <button type="button" onClick={retry}>
                Yeniden yükle
              </button>
            </div>
          )}
          {actionError && (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          )}
          <div className="board">
            {CARD_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                cards={cardsInColumn(state.cards, status)}
                busy={busy}
                canMove={(card, direction) =>
                  moveTarget(state.cards, card, direction) !== null
                }
                onMove={(card, direction) => handleMove(state.cards, card, direction)}
                onSaved={(card) => dispatch({ type: "cardUpdated", card })}
                onStale={refresh}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      );
    default:
      return assertNever(state);
  }
}
