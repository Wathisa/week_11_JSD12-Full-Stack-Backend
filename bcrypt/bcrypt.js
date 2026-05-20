import bcrypt from "bcrypt";

async function hashPassword(string) {
  const hashedPassword = bcrypt.hash(string, 12);
  return hashedPassword;
}

// const password = await hashPassword("9uhdyoot");
// console.log(password);

console.log(
  await bcrypt.compare(
    "9uhdyoot",
    "$2b$12$zIJC9Xb4CMZqctFmaLVOL.moaAiUwAEdAsFWQgFRn95cYpHcr4b2a",
  ),
);
