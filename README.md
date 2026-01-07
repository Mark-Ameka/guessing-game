# Word Impostor Game

A real-time multiplayer word guessing game where players take turns describing a word, while one player (the impostor) doesn't know what the word is and must blend in.

## 🎮 Game Features

- **Real-time Multiplayer**: WebSocket-based communication for instant updates
- **Room-based Gameplay**: Create or join rooms with unique codes
- **Customizable Settings**: Choose word categories, number of rotations, and sets
- **Turn-based System**: Players take turns with 60-second time limits
- **Voting System**: Vote for who you think the impostor is
- **Scoring System**: Earn points for correct votes and successful deception
- **Leaderboard**: Track scores across multiple sets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd word-impostor-game
```

2. **Setup Server**

```bash
cd server
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

3. **Setup Client** (in a new terminal)

```bash
cd client
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

4. **Open your browser**

- Navigate to `http://localhost:5173`
- Create a room or join with a room code
- Share the room code with friends!

## 📁 Project Structure

```
word-impostor-game/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── ui/       # ShadCN components
│   │   │   ├── game/     # Game-specific components
│   │   │   └── lobby/    # Lobby components
│   │   ├── pages/        # Route pages
│   │   │   ├── Home.tsx
│   │   │   ├── Lobby.tsx
│   │   │   ├── Game.tsx
│   │   │   └── Results.tsx
│   │   ├── stores/       # Zustand state management
│   │   ├── services/     # WebSocket service
│   │   ├── types/        # TypeScript types
│   │   ├── constants/    # Game constants & words
│   │   └── utils/        # Utility functions
│   └── package.json
│
└── server/                # WebSocket server
    ├── src/
    │   ├── index.ts      # Server entry point
    │   ├── game.ts       # Game logic
    │   └── types.ts      # Shared types
    └── package.json
```

## 🎯 How to Play

1. **Create/Join Room**: One player creates a room and shares the code
2. **Configure Settings**: Host sets categories, rotations, and number of sets
3. **Game Starts**: Each player gets the same word except one (the impostor)
4. **Take Turns**: Players describe the word one at a time (60 seconds each)
5. **Vote**: After all rotations, vote for who you think is the impostor
6. **Score Points**:
   - Correct votes: +1000 points
   - Impostor survives: +2000 points
7. **Multiple Sets**: Continue playing with new words and impostors

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development
- **Zustand** for state management
- **TailwindCSS** for styling
- **ShadCN UI** for components
- **Socket.io Client** for WebSocket
- **React Router** for navigation
- **Lucide React** for icons

### Backend

- **Node.js** with TypeScript
- **Express** for HTTP server
- **Socket.io** for WebSocket server
- **CORS** enabled for cross-origin requests

## 📦 Deployment

### Deploy Server (Render.com - Free)

1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: 3001
     - `CLIENT_URL`: `https://your-frontend-url.vercel.app`
5. Deploy!

### Deploy Client (Vercel - Free)

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to client folder: `cd client`
3. Run: `vercel`
4. Set environment variable in Vercel dashboard:
   - `VITE_SOCKET_URL`: `https://your-server-url.onrender.com`
5. Deploy: `vercel --prod`

### Alternative Deployment Options

**Server:**

- Railway.app (free trial)
- Fly.io (free tier)
- Heroku (paid)

**Client:**

- Netlify (free tier)
- Cloudflare Pages (free tier)
- GitHub Pages (free)

## 🔧 Development

### Available Scripts

**Client:**

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

**Server:**

```bash
npm run dev      # Start with nodemon & ts-node
npm run build    # Compile TypeScript
npm start        # Run compiled JavaScript
```

### Adding New Word Categories

Edit `client/src/constants/words.ts`:

```typescript
export const WORD_CATEGORIES: Record<string, string[]> = {
  YourCategory: [
    "word1",
    "word2",
    "word3", // Add your words
  ],
  // ... other categories
};
```

## 🐛 Troubleshooting

**WebSocket Connection Failed:**

- Check if server is running on correct port
- Verify CORS settings in server
- Check firewall settings
- Ensure VITE_SOCKET_URL is correct

**Players Not Updating:**

- Check browser console for errors
- Verify WebSocket connection is established
- Try refreshing the page

**Room Not Found:**

- Room codes are case-sensitive
- Rooms are cleared when all players leave
- Check if server restarted (clears all rooms)

## 📝 License

MIT License - feel free to use this project however you'd like!

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Enjoy the game! 🎉**
