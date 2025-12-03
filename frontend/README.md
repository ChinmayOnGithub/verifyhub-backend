# VerifyHub Frontend

React-based frontend for the VerifyHub blockchain certificate verification platform.

## Features

- Modern React 19 with Vite
- Tailwind CSS for styling
- Real-time updates via Socket.IO
- Certificate generation and verification
- Institution logo management
- Responsive design

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

## Project Structure

```
src/
├── components/     # Reusable components
├── contexts/       # React contexts (Auth, etc.)
├── pages/          # Page components
└── App.jsx         # Main app component
```

For more information, see the main [README](../README.md).
