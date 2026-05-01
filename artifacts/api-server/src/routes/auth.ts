import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const PEPPER = "pixocraft-secret-2026";
const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret-do-not-use";
const JWT_EXPIRY = "30d";

// SHA-256(password + pepper) hex strings — precomputed and verified
const VALID_USERS: Record<string, string> = {
  Suraj: "ddd4d201fa68575af7ce5f6bcb5e71ac1c163dddf665deb1f051f230bd382457",
  Vivek: "244b12b2a7b2c24547c2d4bcc016df085b7b17f73a91e4a2ed8f79fc5af5f682",
};

function checkPassword(input: string, username: string): boolean {
  const expected = VALID_USERS[username];
  if (!expected) return false;
  const actual = createHash("sha256").update(input + PEPPER).digest("hex");
  return actual === expected;
}

router.post("/auth/login", (req, res): void => {
  const { password } = req.body as { password?: string };

  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password required" });
    return;
  }

  const matchedUser = Object.keys(VALID_USERS).find((user) =>
    checkPassword(password, user),
  );

  if (!matchedUser) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = jwt.sign({ username: matchedUser }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  res.json({ token, username: matchedUser });
});

router.post("/auth/verify", (req, res): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ valid: false });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { username: string };
    res.json({ valid: true, username: payload.username });
  } catch {
    res.status(401).json({ valid: false });
  }
});

export default router;
