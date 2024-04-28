# Real-Time Messaging API

## Overview

The Real-Time Messaging API is a robust messaging solution designed to facilitate real-time communication between users or applications. It provides a seamless experience for sending and receiving messages instantly.

This API leverages WebSockets to establish a persistent, bidirectional communication channel between clients and servers, ensuring efficient message delivery with minimal latency. It supports various features such as user authentication, presence detection.

## Getting Started

To get started with the Real-Time Messaging API, follow these steps:

1. **Clone repository**

```bash
git clone https://github.com/lovistawiah/chat-api.git
```

2. **Install Dependencies**

```bash
npm install
```

3. **Create .env file in the root dir and add key/value pair**

```Properties
MONGO_URI=value
JWT_SECRET=value
```

4. **Start dev server**

```bash
npm run dev
```

## Issue starting dev server

```bash
npm install nodemon
```

_or_

```diff
edit package.json file

- nodemon dist/main.js
+ node dist/main.js
```

## Features

- **Real-Time Communication:** Establish instant, bidirectional communication between clients and servers.
- **WebSocket Support:** Utilize WebSockets for persistent connections, enabling real-time message delivery.
- **User Authentication:** Authenticate users to ensure secure access to messaging services.
- **Presence Detection:** Monitor user presence to determine online/offline status.
- **Message History:** Retrieve message history for seamless conversation continuity.
- **Secure Socket:** Using jsonweb token as secure handshake protocol.

## Next Major Features

- **Message Encryption:** Encrypt messages to ensure data privacy and security.
- **Media Share:** Sharing of media data.
- **Vide/Audio Call:** Making of video and audio calls at low latency.
- **Passkeys:** Passkeys as multi factor authentication.
- **Group chats :** support for more than two users in chat.
