const {
  scrypt,
  randomFill,
  createCipheriv,
  scryptSync,
  createDecipheriv,
} = require("node:crypto");
const { Buffer } = require("node:buffer");
const algorithm = "aes-192-cbc";
const password = "Password used to generate key";

// scrypt(password, "salt", 24, (err, key) => {
//   if (err) throw err;
//   // Then, we'll generate a random initialization vector
//   randomFill(new Uint8Array(16), (err, iv) => {
//     if (err) throw err;

//     const cipher = createCipheriv(algorithm, key, iv);

//     let encrypted = cipher.update(
//       "some clear text",
//       "utf8",
//       "hex"
//     );
//     encrypted += cipher.final("hex");
//     console.log(encrypted);
//   });
// });

// !

const key = scryptSync(password, "salt", 24);
// The IV is usually passed along with the ciphertext.
const iv = Buffer.alloc(16, 0); // Initialization vector.

const decipher = createDecipheriv(algorithm, key, iv);

// Encrypted using same algorithm, key and iv.
const encrypted = "f6718092156611a7183393924f9f4bb3";
let decrypted = decipher.update(encrypted, "hex", "utf8");
decrypted += decipher.final("utf8");
console.log(decrypted);
