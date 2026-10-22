import type { Member } from "@live-board/shared";

interface MemberListProps {
  members: readonly Member[];
  me: string | null;
}

export function MemberList({ members, me }: MemberListProps) {
  return (
    <section className="members" aria-label="Panodakiler">
      <h2>Panodakiler ({members.length})</h2>
      <ul>
        {members.map((member) => (
          <li
            key={member.connectionId}
            className={member.connectionId === me ? "member member-me" : "member"}
          >
            {member.name}
            {member.connectionId === me && " (sen)"}
          </li>
        ))}
      </ul>
    </section>
  );
}
