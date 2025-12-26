/**
 * API Service
 * Handles all communication with the backend
 */

import { getIdToken } from '../config/firebase.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = await getIdToken();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }

    return data;
}

// ============================================================================
// LOCATION TRACKING SETTINGS API
// ============================================================================

/**
 * Get default settings template
 */
export async function getDefaultSettings() {
    const response = await fetch(`${API_BASE_URL}/api/location-tracking-settings/defaults`);
    return response.json();
}

/**
 * Get current user's settings
 */
export async function getMySettings() {
    return apiRequest('/api/location-tracking-settings');
}

/**
 * Update current user's settings
 */
export async function updateMySettings(settings) {
    return apiRequest('/api/location-tracking-settings', {
        method: 'POST',
        body: JSON.stringify(settings)
    });
}

/**
 * Enable a specific mode for current user
 */
export async function enableMode(mode, duration = null) {
    return apiRequest('/api/location-tracking-settings/enable-mode', {
        method: 'POST',
        body: JSON.stringify({ mode, duration })
    });
}

/**
 * Disable a specific mode for current user
 */
export async function disableMode(mode) {
    return apiRequest('/api/location-tracking-settings/disable-mode', {
        method: 'POST',
        body: JSON.stringify({ mode })
    });
}

/**
 * Reset current user's settings to defaults
 */
export async function resetMySettings(keepHistory = false) {
    return apiRequest('/api/location-tracking-settings/reset', {
        method: 'POST',
        body: JSON.stringify({ keepHistory })
    });
}

/**
 * Get settings change history
 */
export async function getSettingsHistory(limit = 20) {
    return apiRequest(`/api/location-tracking-settings/history?limit=${limit}`);
}

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * Admin: Get settings for a specific user
 */
export async function adminGetUserSettings(userId) {
    return apiRequest(`/api/location-tracking-settings/admin/user/${userId}`);
}

/**
 * Admin: Update settings for a specific user
 */
export async function adminUpdateUserSettings(userId, settings) {
    return apiRequest(`/api/location-tracking-settings/admin/user/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(settings)
    });
}

/**
 * Admin: Get all users' settings
 */
export async function adminGetAllSettings(limit = 50, startAfter = null) {
    let url = `/api/location-tracking-settings/admin/all?limit=${limit}`;
    if (startAfter) {
        url += `&startAfter=${startAfter}`;
    }
    return apiRequest(url);
}

/**
 * Admin: Broadcast settings to all users
 */
export async function adminBroadcastSettings(settings, reason = '') {
    return apiRequest('/api/location-tracking-settings/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ settings, reason })
    });
}

/**
 * Admin: Force sync settings to a specific user
 * This triggers an immediate sync and saves all settings at once
 */
export async function adminForceSyncUserSettings(userId) {
    return apiRequest(`/api/location-tracking-settings/admin/user/${userId}/force-sync`, {
        method: 'POST'
    });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check API health
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/location-tracking-settings/health`);
        return response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// USER PROFILE API
// ============================================================================

/**
 * Get user profile
 */
export async function getUserProfile(userId) {
    return apiRequest(`/api/profile/${userId}`);
}

// ============================================================================
// LOCATION DATA API
// ============================================================================

/**
 * Get user's location history
 */
export async function getUserLocations(userId, limit = 100) {
    return apiRequest(`/api/location/user/${userId}?limit=${limit}`);
}

/**
 * Get user's location history with date range
 */
export async function getUserLocationsByDateRange(userId, startDate, endDate, limit = 500) {
    const start = startDate instanceof Date ? startDate.toISOString() : startDate;
    const end = endDate instanceof Date ? endDate.toISOString() : endDate;
    return apiRequest(`/api/location/user/${userId}/range?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&limit=${limit}`);
}

/**
 * Get latest location for a user
 */
export async function getUserLatestLocation(userId) {
    return apiRequest(`/api/location/user/${userId}/latest`);
}

/**
 * Get locations for multiple users (for admin dashboard)
 */
export async function getMultipleUsersLocations(userIds, limit = 50) {
    return apiRequest('/api/location/admin/multiple', {
        method: 'POST',
        body: JSON.stringify({ userIds, limit })
    });
}

/**
 * Get all recent locations (admin)
 */
export async function getAllRecentLocations(limit = 100, hoursAgo = 24) {
    return apiRequest(`/api/location/admin/recent?limit=${limit}&hoursAgo=${hoursAgo}`);
}

/**
 * Get location statistics for a user
 */
export async function getUserLocationStats(userId) {
    return apiRequest(`/api/location/user/${userId}/stats`);
}

export default {
    getDefaultSettings,
    getMySettings,
    updateMySettings,
    enableMode,
    disableMode,
    resetMySettings,
    getSettingsHistory,
    adminGetUserSettings,
    adminUpdateUserSettings,
    adminGetAllSettings,
    adminBroadcastSettings,
    adminForceSyncUserSettings,
    checkHealth,
    getUserProfile,
    getUserLocations,
    getUserLocationsByDateRange,
    getUserLatestLocation,
    getMultipleUsersLocations,
    getAllRecentLocations,
    getUserLocationStats
};

