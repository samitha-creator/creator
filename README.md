# WebAuthn Passkey Demo

This project is a simple **Node.js** server that demonstrates how to implement **WebAuthn (passkeys)** for passwordless authentication using the [`@simplewebauthn/server`](https://www.npmjs.com/package/@simplewebauthn/server) and [`@simplewebauthn/browser`](https://www.npmjs.com/package/@simplewebauthn/browser) libraries.

The server handles both the **registration** and **authentication** of passkeys, while the client-side HTML provides a basic user interface to interact with the server.

---

## ✨ Features

- **Passkey Registration**: Users can register a new passkey to create an account.
- **Passkey Authentication**: Users can log in using their registered passkey without a password.
- **Challenge-Based Security**: Session-based challenges help prevent replay attacks.
- **In-Memory Database**: Uses a simple `Map` to temporarily store user credentials in memory.

---

## 📦 Prerequisites

Ensure you have the following installed:

- [Node.js (LTS)](https://nodejs.org/)
- npm (comes with Node.js)

---

## ⚙️ Installation

1. Save the provided code as `server.js`.
2. Install the required dependencies:

```bash
npm install express express-session @simplewebauthn/server
