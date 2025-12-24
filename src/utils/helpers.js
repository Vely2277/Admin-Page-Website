/**
 * Utility Functions
 */

/**
 * Format seconds to human readable time
 */
export function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (minutes > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(seconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''}`;
    }
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp) {
    if (!timestamp) return 'Never';

    const date = timestamp._seconds
        ? new Date(timestamp._seconds * 1000)
        : new Date(timestamp);

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Never';

    const date = timestamp._seconds
        ? new Date(timestamp._seconds * 1000)
        : new Date(timestamp);

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

    return formatDate(timestamp);
}

/**
 * Calculate time remaining until expiration
 */
export function getTimeRemaining(expiresAt) {
    if (!expiresAt) return null;

    const expiry = expiresAt._seconds
        ? new Date(expiresAt._seconds * 1000)
        : new Date(expiresAt);

    const now = new Date();
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const diffSec = Math.floor(diffMs / 1000);
    return formatDuration(diffSec);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Validate User ID format
 */
export function isValidUserId(userId) {
    if (!userId || typeof userId !== 'string') return false;
    // Firebase UIDs are typically 28 characters
    return userId.length >= 10 && userId.length <= 128 && /^[a-zA-Z0-9]+$/.test(userId);
}

/**
 * Parse multiple user IDs from input
 */
export function parseUserIds(input) {
    if (!input) return [];

    // Split by comma, semicolon, newline, or space
    const ids = input.split(/[,;\n\s]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

    return [...new Set(ids)]; // Remove duplicates
}

/**
 * Get active mode name
 */
export function getActiveModeName(settings) {
    if (!settings) return 'Unknown';

    if (settings.emergencyModeEnabled) return 'Emergency';
    if (settings.realtimeModeEnabled) return 'Realtime';
    if (settings.forceCheckEnabled) return 'Force Check';
    if (settings.trackingEnabled) return 'Normal';
    return 'Disabled';
}

/**
 * Get effective interval based on current mode
 */
export function getEffectiveInterval(settings) {
    if (!settings) return null;

    if (settings.emergencyModeEnabled) return settings.emergencyInterval;
    if (settings.realtimeModeEnabled) return settings.realtimeInterval;
    if (settings.forceCheckEnabled) return settings.forceCheckInterval;
    if (settings.trackingEnabled) return settings.updateInterval;
    return null;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate a random ID
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

export default {
    formatDuration,
    formatDate,
    formatRelativeTime,
    getTimeRemaining,
    debounce,
    deepClone,
    isValidUserId,
    parseUserIds,
    getActiveModeName,
    getEffectiveInterval,
    escapeHtml,
    generateId
};

