# Location Tracking Admin Panel

A comprehensive web-based admin panel for managing location tracking settings across all users.

## Features

- **User Settings Management**: Load and edit individual user settings by User ID
- **Multi-User Support**: Handle multiple users at once
- **Mode Management**: Enable/disable Force Check, Realtime, and Emergency modes
- **Interval Configuration**: Customize tracking intervals for each mode
- **Auto-Reset Durations**: Set how long special modes stay active
- **Broadcast Settings**: Update settings for all users simultaneously
- **Real-time Status**: View active modes and time remaining

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Firebase project set up
- Backend API deployed

### 2. Installation

```bash
# Navigate to the admin panel directory
cd "Admin Page Website"

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configuration

Edit the `.env` file with your values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend URL
VITE_API_BASE_URL=https://your-backend.onrender.com
```

### 4. Development

```bash
npm run dev
```

Opens at http://localhost:3000

### 5. Production Build

```bash
npm run build
```

Deploy the `dist` folder to any static hosting service.

## Usage

### Dashboard
- Overview of default settings
- Quick navigation to all features

### User Settings
1. Enter one or more User IDs (comma-separated)
2. Click "Load Settings"
3. Edit intervals, thresholds, and modes
4. Save changes per user

### Tracking Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Normal | Standard tracking | Default mode |
| Force Check | Frequent updates | Verification |
| Realtime | Very frequent | Live tracking |
| Emergency | Maximum frequency | Critical situations |

### Broadcast
Send setting changes to ALL users at once:
1. Enter a reason for the change
2. Enable settings you want to update
3. Set the values
4. Click Broadcast

## API Integration

The admin panel integrates with these backend endpoints:

- `GET /api/location-tracking-settings/defaults` - Get default settings
- `GET /api/location-tracking-settings/admin/user/:userId` - Get user settings
- `PUT /api/location-tracking-settings/admin/user/:userId` - Update user settings
- `POST /api/location-tracking-settings/admin/broadcast` - Broadcast to all

## Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload dist folder
```

### Firebase Hosting
```bash
npm i -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Security

- Uses Firebase Authentication
- Only authenticated admin users can access
- All API calls require valid auth tokens
- Set up Firebase Admin users in your Firebase Console

## Troubleshooting

**Login fails?**
- Check Firebase config in .env
- Ensure your email is added as a Firebase user

**API errors?**
- Verify VITE_API_BASE_URL is correct
- Check backend is running
- Verify auth token is being sent

**Settings not saving?**
- Check network tab for errors
- Verify user ID exists
- Check backend logs

## License

Private - Internal Use Only

