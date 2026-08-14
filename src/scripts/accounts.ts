import { createInterface } from "node:readline/promises";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

const USAGE = `Usage: npm run accounts            Interactive wizard
       npm run accounts -- <command> [args]

Commands:
  create <name> <email> <password> [cafeName]   Create user + venue
  list                                         List users with venues and status
  add-venue <email> <cafeName>                 Add a venue to an existing user
  reset-password <email> <newPassword>         Reset password, unlock, revoke sessions
  status <email> active|suspended              Set user status
  delete <email>                               Delete user (cascades venues)
  help                                         Show this help`;

const persianToAscii: Record<string, string> = {
  "آ": "a", "ا": "a", "ب": "b", "پ": "p", "ت": "t", "ث": "s",
  "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ذ": "z",
  "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
  "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f",
  "ق": "gh", "ک": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n",
  "و": "v", "ه": "h", "ی": "y",
  " ": "-", "_": "-",
};

function generateSlug(nameFa: string): string {
  let slug = "";
  for (const ch of nameFa.trim().toLowerCase()) {
    slug += persianToAscii[ch] ?? (ch.match(/[a-z0-9-]/) ? ch : "");
  }
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug || "cafe";
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.venue.findFirst({
    where: { slug: { startsWith: base } },
    select: { slug: true },
    orderBy: { slug: "desc" },
  });
  if (!existing) return base;
  const match = existing.slug.match(new RegExp(`^${base}-(\\d+)$`));
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `${base}-${next}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function createVenue(userId: string, cafeName: string) {
  const slug = await uniqueSlug(generateSlug(cafeName));
  const venue = await prisma.venue.create({
    data: { ownerId: userId, nameFa: cafeName, slug },
  });
  console.log("Venue created:");
  console.log(`  Venue URL: /m/${slug}`);
  console.log(`  Admin URL: /admin/${venue.id}/menu`);
}

async function cmdCreate(args: string[]) {
  const [name, email, password, cafeName] = args;
  if (!name || !email || !password) die(USAGE);
  if (!isValidEmail(email)) die("Invalid email");
  if (password.length < 8) die("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) die(`User already exists: ${email}`);

  const passwordHash = await hashPassword(password);
  const slug = await uniqueSlug(generateSlug(cafeName ?? name));
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, status: "active" },
    });
    const venue = await tx.venue.create({
      data: { ownerId: user.id, nameFa: cafeName ?? `${name}'s Cafe`, slug },
    });
    return { userId: user.id, venueId: venue.id };
  });

  console.log("Account created:");
  console.log(`  Email: ${email}`);
  console.log(`  Venue URL: /m/${slug}`);
  console.log(`  Admin URL: /admin/${result.venueId}/menu`);
}

async function cmdList() {
  const users = await prisma.user.findMany({
    include: { ownedVenues: { select: { id: true, nameFa: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (users.length === 0) {
    console.log("No users");
    return;
  }
  for (const u of users) {
    const lock = u.lockedUntil && u.lockedUntil > new Date() ? " (locked)" : "";
    console.log(`${u.email}  [${u.status}${lock}]  ${u.name}`);
    for (const v of u.ownedVenues) {
      console.log(`    ${v.nameFa}  /m/${v.slug}`);
    }
  }
}

async function cmdAddVenue(args: string[]) {
  const [email, cafeName] = args;
  if (!email || !cafeName) die(USAGE);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) die(`User not found: ${email}`);
  await createVenue(user.id, cafeName);
}

async function cmdResetPassword(args: string[]) {
  const [email, password] = args;
  if (!email || !password) die(USAGE);
  if (password.length < 8) die("Password must be at least 8 characters");
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) die(`User not found: ${email}`);

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, lockedUntil: null },
  });
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  console.log(`Password reset for ${email}; sessions revoked`);
}

async function cmdStatus(args: string[]) {
  const [email, status] = args;
  if (!email || (status !== "active" && status !== "suspended")) die(USAGE);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) die(`User not found: ${email}`);
  await prisma.user.update({ where: { id: user.id }, data: { status } });
  if (status === "suspended") {
    await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  console.log(`${email} is now ${status}`);
}

async function cmdDelete(args: string[]) {
  const [email] = args;
  if (!email) die(USAGE);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) die(`User not found: ${email}`);
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Deleted ${email} and all venues`);
}

const ACTIONS = [
  ["create", "Create account (user + venue)"],
  ["list", "List users"],
  ["add-venue", "Add venue to a user"],
  ["reset-password", "Reset password"],
  ["status", "Set user status"],
  ["delete", "Delete user"],
] as const;

async function promptUser(rl: ReturnType<typeof createInterface>, question: string, validate?: (v: string) => string | null | Promise<string | null>) {
  while (true) {
    let answer: string;
    try {
      answer = (await rl.question(`${question} `)).trim();
    } catch {
      process.exit(0);
    }
    if (answer === "q" || answer === "quit") process.exit(0);
    if (validate) {
      const error = await validate(answer);
      if (error) {
        console.error(`  ${error}`);
        continue;
      }
    }
    return answer;
  }
}

async function promptEmail(rl: ReturnType<typeof createInterface>, question: string) {
  return promptUser(rl, question, (v) => (!isValidEmail(v) ? "Invalid email" : null));
}

async function promptPassword(rl: ReturnType<typeof createInterface>) {
  return promptUser(rl, "Password:", (v) => (v.length < 8 ? "Must be at least 8 characters" : null));
}

async function promptUserByEmail(rl: ReturnType<typeof createInterface>) {
  return promptUser(rl, "User email:", async (v) => {
    const user = await prisma.user.findUnique({ where: { email: v }, select: { id: true } });
    return user ? null : `User not found: ${v}`;
  });
}

async function wizard() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("mofé account manager — enter 'q' to quit at any prompt\n");
  try {
    while (true) {
      console.log("Choose an action:");
      ACTIONS.forEach(([, label], i) => console.log(`  ${i + 1}) ${label}`));
      const choice = await promptUser(rl, "Action [1-6]:", (v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= ACTIONS.length ? null : "Pick a number 1-6";
      });
      console.log();
      switch (ACTIONS[Number(choice) - 1][0]) {
        case "create": {
          const name = await promptUser(rl, "Name:", (v) => (v ? null : "Required"));
          const email = await promptEmail(rl, "Email:");
          const password = await promptPassword(rl);
          const cafeName = await promptUser(rl, "Cafe name (Enter to skip):");
          console.log();
          await cmdCreate(cafeName ? [name, email, password, cafeName] : [name, email, password]);
          break;
        }
        case "list":
          await cmdList();
          break;
        case "add-venue": {
          const email = await promptUserByEmail(rl);
          const cafeName = await promptUser(rl, "Cafe name:", (v) => (v ? null : "Required"));
          console.log();
          await cmdAddVenue([email, cafeName]);
          break;
        }
        case "reset-password": {
          const email = await promptUserByEmail(rl);
          const password = await promptPassword(rl);
          console.log();
          await cmdResetPassword([email, password]);
          break;
        }
        case "status": {
          const email = await promptUserByEmail(rl);
          const status = await promptUser(rl, "Status (active/suspended):", (v) =>
            v === "active" || v === "suspended" ? null : "Pick 'active' or 'suspended'");
          console.log();
          await cmdStatus([email, status]);
          break;
        }
        case "delete": {
          const email = await promptUserByEmail(rl);
          const confirm = await promptUser(rl, `Delete ${email} and all venues? (yes/no):`, (v) =>
            v === "yes" || v === "no" ? null : "Type 'yes' or 'no'");
          if (confirm !== "yes") {
            console.log("Aborted");
            break;
          }
          console.log();
          await cmdDelete([email]);
          break;
        }
      }
      console.log();
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    await wizard();
    return;
  }
  switch (command) {
    case "create": await cmdCreate(args); break;
    case "list": await cmdList(); break;
    case "add-venue": await cmdAddVenue(args); break;
    case "reset-password": await cmdResetPassword(args); break;
    case "status": await cmdStatus(args); break;
    case "delete": await cmdDelete(args); break;
    case "help": console.log(USAGE); break;
    default: die(`Unknown command: ${command}\n\n${USAGE}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });