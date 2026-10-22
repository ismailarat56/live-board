import { z } from "zod";

export const MemberNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Ad boş olamaz." })
  .max(30, { error: "Ad en fazla 30 karakter olabilir." });

export const MemberSchema = z.object({
  connectionId: z.string().min(1),
  name: MemberNameSchema,
});

export type Member = z.infer<typeof MemberSchema>;

export const MembersSchema = z.array(MemberSchema);

export function compareMembers(a: Member, b: Member): number {
  return (
    a.name.localeCompare(b.name, "tr") || a.connectionId.localeCompare(b.connectionId)
  );
}
