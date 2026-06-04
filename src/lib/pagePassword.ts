/** 페이지 비밀번호 해시 (SHA-256, 클라이언트 전용) */
export async function hashPagePassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPagePassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  const hash = await hashPagePassword(password);
  return hash === passwordHash;
}

export function isPasswordValid(password: string): boolean {
  return password.length >= 4;
}
