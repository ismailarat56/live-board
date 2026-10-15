import { z } from "zod";

const UserSchema = z.object({
  name: z.string().trim().min(1),
  age: z.number().int().min(0),
  email: z.email(),
});

type User = z.infer<typeof UserSchema>;

const user: User = UserSchema.parse({
  name: "  İsmail  ",
  age: 24,
  email: "ismail@example.com",
});

console.log(user);

const bad = UserSchema.safeParse({ name: " ", age: 2.5, email: "ismail" });

if (bad.success) {
  console.log(bad.data.name);
} else {
  console.log(bad.error.issues);
  console.log(z.prettifyError(bad.error));
}

const TaskSchema = z.object({
  title: z.string(),
  done: z.boolean().default(false),
});

type TaskInput = z.input<typeof TaskSchema>;
type TaskOutput = z.output<typeof TaskSchema>;

const draft: TaskInput = { title: "Yaz" };
const task: TaskOutput = TaskSchema.parse(draft);

console.log(task);
console.log(TaskSchema.parse({ title: "Yaz", priority: 5 }));
console.log(
  z.strictObject({ title: z.string() }).safeParse({ title: "Yaz", priority: 5 })
    .success
);

const fromJson: unknown = JSON.parse('{ "title": "Yaz", "done": "true" }');
const checked = TaskSchema.safeParse(fromJson);

console.log(checked.success ? checked.data : checked.error.issues[0]);
