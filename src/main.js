/**
 * Location Tracking Admin Panel - Main Entry Point
 */

import { onAuthChange, loginWithEmail, logout, getCurrentUser } from './config/firebase.js';
import * as api from './services/api.js';
import toast from './services/toast.js';
import {
    formatDuration,
    formatDate,
    formatRelativeTime,
    getTimeRemaining,
    parseUserIds,
    isValidUserId,
    getActiveModeName,
    getEffectiveInterval,
    escapeHtml,
    debounce
} from './utils/helpers.js';

// ============================================================================
// APP STATE
// ============================================================================
const state = {
    user: null,
    currentPage: 'dashboard',
    loadedUsers: new Map(), // userId -> settings data
    defaults: null,
    loading: false,
    // Map-related state
    map: null,
    mapMarkers: [],
    mapPolylines: [],
    mapLocations: [],
    selectedMapUser: null,
    mapDateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
    },
    playbackIndex: 0,
    isPlaying: false,
    playbackSpeed: 1000 // ms between points
};

// ============================================================================
// ICONS
// ============================================================================
const icons = {
    dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    broadcast: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path><circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path></svg>`,
    history: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    logout: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    location: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    map: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    zap: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    save: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    navigation: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Listen for auth state changes
    onAuthChange(async (user) => {
        state.user = user;
        hideLoading();

        if (user) {
            // Load defaults
            try {
                const defaultsResponse = await api.getDefaultSettings();
                state.defaults = defaultsResponse.defaults;
            } catch (e) {
                console.error('Failed to load defaults:', e);
            }
            renderApp();
        } else {
            renderLoginPage();
        }
    });
});

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

// ============================================================================
// RENDER LOGIN PAGE
// ============================================================================
function renderLoginPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <img src="/favicon.svg" alt="Logo" class="login-logo">
                    <h1 class="login-title">Admin Panel</h1>
                    <p class="login-subtitle">Location Tracking Settings Management</p>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="login-email" class="form-input" placeholder="admin@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <div id="login-error" class="form-error hidden"></div>
                    <button type="submit" id="login-btn" class="btn btn-primary btn-block btn-lg">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    `;

    // Attach login handler
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorDiv.classList.add('hidden');

    const result = await loginWithEmail(email, password);

    if (!result.success) {
        errorDiv.textContent = 'Incorrect details or not an admin user.';
        errorDiv.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// ============================================================================
// RENDER MAIN APP
// ============================================================================
function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="main-layout">
            ${renderSidebar()}
            <main class="main-content">
                ${renderHeader()}
                <div class="content" id="page-content">
                    ${renderPageContent()}
                </div>
            </main>
        </div>
        ${renderModals()}
    `;

    attachEventListeners();
}

function renderSidebar() {
    const user = state.user;
    const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';

    return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <img src="/favicon.svg" alt="Logo">
                    <span class="sidebar-logo-text">Tracking Admin</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Main</div>
                    <button class="nav-item ${state.currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
                        ${icons.dashboard}
                        <span>Dashboard</span>
                    </button>
                    <button class="nav-item ${state.currentPage === 'map' ? 'active' : ''}" data-page="map">
                        ${icons.map}
                        <span>Location Map</span>
                    </button>
                    <button class="nav-item ${state.currentPage === 'users' ? 'active' : ''}" data-page="users">
                        ${icons.users}
                        <span>User Settings</span>
                    </button>
                </div>
                <div class="nav-section">
                    <div class="nav-section-title">Admin Actions</div>
                    <button class="nav-item ${state.currentPage === 'broadcast' ? 'active' : ''}" data-page="broadcast">
                        ${icons.broadcast}
                        <span>Broadcast</span>
                    </button>
                    <button class="nav-item ${state.currentPage === 'defaults' ? 'active' : ''}" data-page="defaults">
                        ${icons.settings}
                        <span>Default Settings</span>
                    </button>
                </div>
            </nav>
            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">${initial}</div>
                    <div class="user-details">
                        <div class="user-name">${escapeHtml(user?.email || 'Admin')}</div>
                        <div class="user-role">Administrator</div>
                    </div>
                    <button class="btn btn-icon" id="logout-btn" title="Logout">
                        ${icons.logout}
                    </button>
                </div>
            </div>
        </aside>
    `;
}

function renderHeader() {
    const titles = {
        dashboard: 'Dashboard',
        map: 'Location Map',
        users: 'User Settings',
        broadcast: 'Broadcast Settings',
        defaults: 'Default Settings'
    };

    return `
        <header class="header">
            <div class="header-left">
                <h1 class="page-title">${titles[state.currentPage] || 'Dashboard'}</h1>
            </div>
            <div class="header-right">
                <button class="btn btn-secondary btn-sm" id="refresh-btn">
                    ${icons.refresh} Refresh
                </button>
            </div>
        </header>
    `;
}

function renderPageContent() {
    switch (state.currentPage) {
        case 'dashboard':
            return renderDashboardPage();
        case 'map':
            return renderMapPage();
        case 'users':
            return renderUsersPage();
        case 'broadcast':
            return renderBroadcastPage();
        case 'defaults':
            return renderDefaultsPage();
        default:
            return renderDashboardPage();
    }
}

// ============================================================================
// DASHBOARD PAGE
// ============================================================================
function renderDashboardPage() {
    return `
        <div class="alert alert-info mb-3">
            <span>${icons.alert}</span>
            <div>
                <strong>Welcome to Location Tracking Admin Panel</strong><br>
                Use this panel to manage location tracking settings for users. You can set intervals, enable special modes, and broadcast settings to all users.
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Default Update Interval</div>
                <div class="stat-value">${state.defaults ? formatDuration(state.defaults.updateInterval) : 'Loading...'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Realtime Interval</div>
                <div class="stat-value">${state.defaults ? formatDuration(state.defaults.realtimeInterval) : 'Loading...'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Force Check Interval</div>
                <div class="stat-value">${state.defaults ? formatDuration(state.defaults.forceCheckInterval) : 'Loading...'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Emergency Interval</div>
                <div class="stat-value">${state.defaults ? formatDuration(state.defaults.emergencyInterval) : 'Loading...'}</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div>
                    <h3 class="card-title">Quick Actions</h3>
                    <p class="card-subtitle">Common administrative tasks</p>
                </div>
            </div>
            <div class="card-body">
                <div class="d-flex gap-2" style="flex-wrap: wrap;">
                    <button class="btn btn-primary" data-page="users">
                        ${icons.users} Manage User Settings
                    </button>
                    <button class="btn btn-warning" data-page="broadcast">
                        ${icons.broadcast} Broadcast to All
                    </button>
                    <button class="btn btn-secondary" data-page="defaults">
                        ${icons.settings} View Defaults
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// USERS PAGE
// ============================================================================
function renderUsersPage() {
    return `
        <div class="user-selection-panel">
            <h2 class="user-selection-title">${icons.search} Search Users</h2>
            <div class="user-id-input-group">
                <input type="text"
                       id="user-ids-input"
                       class="form-input"
                       placeholder="Enter User ID(s) - separate multiple with commas">
                <button class="btn btn-secondary" id="load-users-btn">
                    ${icons.search} Load Settings
                </button>
            </div>
            <p class="multi-user-hint">
                💡 Tip: You can enter multiple User IDs separated by commas to manage several users at once.
            </p>
        </div>

        <div id="users-container">
            ${state.loadedUsers.size > 0 ? renderLoadedUsers() : renderEmptyState()}
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <h3 class="empty-state-title">No Users Loaded</h3>
            <p>Enter a User ID above to load and manage their location tracking settings.</p>
        </div>
    `;
}

function renderLoadedUsers() {
    let html = '';

    state.loadedUsers.forEach((data, userId) => {
        html += renderUserPanel(userId, data);
    });

    return html;
}

function renderUserPanel(userId, data) {
    const settings = data.settings || {};
    const activeMode = getActiveModeName(settings);
    const effectiveInterval = getEffectiveInterval(settings);

    return `
        <div class="user-panel" data-user-id="${escapeHtml(userId)}">
            <div class="user-panel-header">
                <div>
                    <span class="user-panel-id">${escapeHtml(userId)}</span>
                    ${data.error ? `<span class="badge badge-danger ml-2">Error</span>` : ''}
                </div>
                <div class="user-panel-status">
                    <span class="badge ${settings.trackingEnabled ? 'badge-success' : 'badge-danger'}">
                        ${settings.trackingEnabled ? 'Tracking ON' : 'Tracking OFF'}
                    </span>
                    <span class="badge badge-primary">${activeMode}</span>
                    ${effectiveInterval ? `<span class="badge badge-info">${formatDuration(effectiveInterval)}</span>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="removeUser('${escapeHtml(userId)}')">
                        ${icons.x} Remove
                    </button>
                </div>
            </div>

            ${data.error ? `
                <div class="user-panel-body">
                    <div class="alert alert-danger mb-0">
                        <strong>Error loading settings:</strong> ${escapeHtml(data.error)}
                    </div>
                </div>
            ` : `
                <div class="user-panel-body">
                    <!-- Mode Cards -->
                    <h4 class="mb-2">Tracking Modes</h4>
                    <div class="mode-cards">
                        ${renderModeCard(userId, 'Normal', 'normal', settings.trackingEnabled && !settings.forceCheckEnabled && !settings.realtimeModeEnabled && !settings.emergencyModeEnabled, settings.updateInterval)}
                        ${renderModeCard(userId, 'Force Check', 'force', settings.forceCheckEnabled, settings.forceCheckInterval, settings.forceCheckExpiresAt)}
                        ${renderModeCard(userId, 'Realtime', 'realtime', settings.realtimeModeEnabled, settings.realtimeInterval, settings.realtimeModeExpiresAt)}
                        ${renderModeCard(userId, 'Emergency', 'emergency', settings.emergencyModeEnabled, settings.emergencyInterval, settings.emergencyModeExpiresAt)}
                    </div>

                    <!-- Interval Settings -->
                    <h4 class="mb-2 mt-4">Interval Settings</h4>
                    <div class="settings-grid">
                        ${renderSettingInput(userId, 'updateInterval', 'Normal Update Interval', settings.updateInterval, 'seconds', 'Interval between location updates in normal mode')}
                        ${renderSettingInput(userId, 'forceCheckInterval', 'Force Check Interval', settings.forceCheckInterval, 'seconds', 'Interval when force check mode is enabled')}
                        ${renderSettingInput(userId, 'realtimeInterval', 'Realtime Interval', settings.realtimeInterval, 'seconds', 'Interval for realtime tracking mode')}
                        ${renderSettingInput(userId, 'emergencyInterval', 'Emergency Interval', settings.emergencyInterval, 'seconds', 'Interval for emergency mode')}
                    </div>

                    <!-- Auto-Reset Durations -->
                    <h4 class="mb-2 mt-4">Auto-Reset Durations</h4>
                    <div class="settings-grid">
                        ${renderSettingInput(userId, 'forceCheckDuration', 'Force Check Duration', settings.forceCheckDuration, 'seconds', 'How long force check mode stays active before auto-reset')}
                        ${renderSettingInput(userId, 'realtimeModeDuration', 'Realtime Mode Duration', settings.realtimeModeDuration, 'seconds', 'How long realtime mode stays active before auto-reset')}
                        ${renderSettingInput(userId, 'emergencyModeDuration', 'Emergency Mode Duration', settings.emergencyModeDuration, 'seconds', 'How long emergency mode stays active before auto-reset')}
                    </div>

                    <!-- Thresholds -->
                    <h4 class="mb-2 mt-4">Thresholds & Accuracy</h4>
                    <div class="settings-grid">
                        ${renderSettingInput(userId, 'batteryThreshold', 'Battery Threshold', settings.batteryThreshold, '%', 'Minimum battery level for tracking')}
                        ${renderSettingInput(userId, 'movementThreshold', 'Movement Threshold', settings.movementThreshold, 'meters', 'Minimum distance for location change')}
                        ${renderSettingInput(userId, 'batchUploadSize', 'Batch Upload Size', settings.batchUploadSize, 'locations', 'Number of locations per batch upload')}
                    </div>
                </div>

                <div class="user-panel-actions">
                    <button class="btn btn-primary" onclick="saveUserSettings('${escapeHtml(userId)}')">
                        ${icons.save} Save Changes
                    </button>
                    <button class="btn btn-secondary" onclick="refreshUser('${escapeHtml(userId)}')">
                        ${icons.refresh} Refresh
                    </button>
                    <button class="btn btn-danger" onclick="resetUserSettings('${escapeHtml(userId)}')">
                        Reset to Defaults
                    </button>
                </div>
            `}
        </div>
    `;
}

function renderModeCard(userId, name, mode, isActive, interval, expiresAt = null) {
    const timeRemaining = expiresAt ? getTimeRemaining(expiresAt) : null;

    return `
        <div class="mode-card ${isActive ? 'active' : ''}">
            <div class="mode-card-header">
                <div class="mode-card-title">
                    <div class="mode-icon ${mode}">
                        ${mode === 'normal' ? icons.location : mode === 'force' ? icons.clock : mode === 'realtime' ? icons.zap : icons.alert}
                    </div>
                    <span class="mode-card-name">${name}</span>
                </div>
                ${isActive ? `<span class="badge badge-success">Active</span>` : ''}
            </div>
            <div class="mode-card-body">
                <div class="mode-detail">
                    <span class="mode-detail-label">Interval</span>
                    <span class="mode-detail-value">${formatDuration(interval || 0)}</span>
                </div>
                ${timeRemaining && isActive ? `
                    <div class="mode-detail">
                        <span class="mode-detail-label">Time Remaining</span>
                        <span class="mode-detail-value text-warning">${timeRemaining}</span>
                    </div>
                ` : ''}
            </div>
            <div class="mode-card-actions">
                ${mode !== 'normal' ? `
                    ${isActive ? `
                        <button class="btn btn-sm btn-danger btn-block" onclick="disableMode('${escapeHtml(userId)}', '${mode}')">
                            ${icons.x} Disable
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-success btn-block" onclick="enableMode('${escapeHtml(userId)}', '${mode}')">
                            ${icons.check} Enable
                        </button>
                    `}
                ` : `
                    <span class="text-muted" style="font-size: 0.85rem;">Default mode when others are disabled</span>
                `}
            </div>
        </div>
    `;
}

function renderSettingInput(userId, key, label, value, unit, description) {
    return `
        <div class="setting-item">
            <div class="setting-header">
                <span class="setting-label">${label}</span>
                <span class="setting-value">${value} ${unit}</span>
            </div>
            <p class="setting-description">${description}</p>
            <div class="d-flex gap-1">
                <input type="number"
                       class="form-input setting-input"
                       data-user-id="${escapeHtml(userId)}"
                       data-setting-key="${key}"
                       value="${value}"
                       min="0">
                <span class="form-hint" style="white-space: nowrap; align-self: center;">${unit}</span>
            </div>
        </div>
    `;
}

// ============================================================================
// BROADCAST PAGE
// ============================================================================
function renderBroadcastPage() {
    const defaults = state.defaults || {};

    return `
        <div class="alert alert-warning mb-3">
            <span>${icons.alert}</span>
            <div>
                <strong>Caution: Broadcast Settings</strong><br>
                Broadcasting will update settings for ALL users in the system. Use with care.
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div>
                    <h3 class="card-title">Broadcast Settings to All Users</h3>
                    <p class="card-subtitle">Update specific settings for every user at once</p>
                </div>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Reason for Broadcast</label>
                    <input type="text" id="broadcast-reason" class="form-input" placeholder="e.g., System maintenance, Policy update">
                    <p class="form-hint">This will be recorded in the change history for all affected users.</p>
                </div>

                <h4 class="mt-4 mb-2">Select Settings to Broadcast</h4>
                <div class="settings-grid">
                    <div class="setting-item">
                        <div class="d-flex align-center justify-between mb-1">
                            <label class="form-label mb-0">Update Interval</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="broadcast-updateInterval-enabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <input type="number" id="broadcast-updateInterval" class="form-input" value="${defaults.updateInterval || 7200}" min="1">
                        <p class="form-hint">seconds</p>
                    </div>

                    <div class="setting-item">
                        <div class="d-flex align-center justify-between mb-1">
                            <label class="form-label mb-0">Force Check Interval</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="broadcast-forceCheckInterval-enabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <input type="number" id="broadcast-forceCheckInterval" class="form-input" value="${defaults.forceCheckInterval || 300}" min="1">
                        <p class="form-hint">seconds</p>
                    </div>

                    <div class="setting-item">
                        <div class="d-flex align-center justify-between mb-1">
                            <label class="form-label mb-0">Realtime Interval</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="broadcast-realtimeInterval-enabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <input type="number" id="broadcast-realtimeInterval" class="form-input" value="${defaults.realtimeInterval || 10}" min="1">
                        <p class="form-hint">seconds</p>
                    </div>

                    <div class="setting-item">
                        <div class="d-flex align-center justify-between mb-1">
                            <label class="form-label mb-0">Emergency Interval</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="broadcast-emergencyInterval-enabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <input type="number" id="broadcast-emergencyInterval" class="form-input" value="${defaults.emergencyInterval || 30}" min="1">
                        <p class="form-hint">seconds</p>
                    </div>

                    <div class="setting-item">
                        <div class="d-flex align-center justify-between mb-1">
                            <label class="form-label mb-0">Battery Threshold</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="broadcast-batteryThreshold-enabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <input type="number" id="broadcast-batteryThreshold" class="form-input" value="${defaults.batteryThreshold || 20}" min="0" max="100">
                        <p class="form-hint">percent</p>
                    </div>

                    <div class="setting-item">
                        <div class="d-flex align-center justify-between mb-1">
                            <label class="form-label mb-0">Batch Upload Size</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="broadcast-batchUploadSize-enabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <input type="number" id="broadcast-batchUploadSize" class="form-input" value="${defaults.batchUploadSize || 10}" min="1">
                        <p class="form-hint">locations</p>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-warning btn-lg" id="broadcast-btn">
                    ${icons.broadcast} Broadcast Selected Settings
                </button>
            </div>
        </div>
    `;
}

// ============================================================================
// DEFAULTS PAGE
// ============================================================================
function renderDefaultsPage() {
    const defaults = state.defaults || {};

    return `
        <div class="alert alert-info mb-3">
            <span>${icons.alert}</span>
            <div>
                <strong>Default Settings Reference</strong><br>
                These are the default values that new users receive. These values are defined in the backend.
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">System Default Settings</h3>
            </div>
            <div class="card-body">
                ${state.defaults ? `
                    <div class="settings-grid">
                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Update Interval</span>
                                <span class="setting-value">${formatDuration(defaults.updateInterval)}</span>
                            </div>
                            <p class="setting-description">Default interval for normal tracking mode</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Force Check Interval</span>
                                <span class="setting-value">${formatDuration(defaults.forceCheckInterval)}</span>
                            </div>
                            <p class="setting-description">Default interval for force check mode</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Realtime Interval</span>
                                <span class="setting-value">${formatDuration(defaults.realtimeInterval)}</span>
                            </div>
                            <p class="setting-description">Default interval for realtime mode</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Emergency Interval</span>
                                <span class="setting-value">${formatDuration(defaults.emergencyInterval)}</span>
                            </div>
                            <p class="setting-description">Default interval for emergency mode</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Force Check Duration</span>
                                <span class="setting-value">${formatDuration(defaults.forceCheckDuration)}</span>
                            </div>
                            <p class="setting-description">How long force check stays active</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Realtime Mode Duration</span>
                                <span class="setting-value">${formatDuration(defaults.realtimeModeDuration)}</span>
                            </div>
                            <p class="setting-description">How long realtime mode stays active</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Emergency Mode Duration</span>
                                <span class="setting-value">${formatDuration(defaults.emergencyModeDuration)}</span>
                            </div>
                            <p class="setting-description">How long emergency mode stays active</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Battery Threshold</span>
                                <span class="setting-value">${defaults.batteryThreshold}%</span>
                            </div>
                            <p class="setting-description">Minimum battery for tracking</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Movement Threshold</span>
                                <span class="setting-value">${defaults.movementThreshold} meters</span>
                            </div>
                            <p class="setting-description">Minimum movement distance</p>
                        </div>

                        <div class="setting-item">
                            <div class="setting-header">
                                <span class="setting-label">Batch Upload Size</span>
                                <span class="setting-value">${defaults.batchUploadSize} locations</span>
                            </div>
                            <p class="setting-description">Locations per batch upload</p>
                        </div>
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>Loading defaults...</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

// ============================================================================
// MAP PAGE
// ============================================================================
function renderMapPage() {
    const startDate = state.mapDateRange.start.toISOString().slice(0, 16);
    const endDate = state.mapDateRange.end.toISOString().slice(0, 16);

    return `
        <div class="map-page">
            <!-- Map Controls Panel -->
            <div class="map-controls-panel card">
                <div class="map-controls-header">
                    <h3>${icons.map} Location Tracker</h3>
                </div>

                <div class="map-controls-body">
                    <!-- User Selection -->
                    <div class="form-group">
                        <label class="form-label">User ID</label>
                        <div class="input-group">
                            <input type="text"
                                   id="map-user-id"
                                   class="form-input"
                                   placeholder="Enter User ID..."
                                   value="${state.selectedMapUser || ''}">
                            <button class="btn btn-primary" id="load-map-user-btn">
                                ${icons.search} Load
                            </button>
                        </div>
                    </div>

                    <!-- Date Range -->
                    <div class="form-group">
                        <label class="form-label">${icons.calendar} Date Range</label>
                        <div class="date-range-inputs">
                            <input type="datetime-local"
                                   id="map-start-date"
                                   class="form-input"
                                   value="${startDate}">
                            <span class="date-range-separator">to</span>
                            <input type="datetime-local"
                                   id="map-end-date"
                                   class="form-input"
                                   value="${endDate}">
                        </div>
                    </div>

                    <!-- Quick Date Filters -->
                    <div class="form-group">
                        <label class="form-label">Quick Select</label>
                        <div class="quick-date-buttons">
                            <button class="btn btn-sm btn-secondary" data-hours="1">1h</button>
                            <button class="btn btn-sm btn-secondary" data-hours="6">6h</button>
                            <button class="btn btn-sm btn-secondary active" data-hours="24">24h</button>
                            <button class="btn btn-sm btn-secondary" data-hours="72">3d</button>
                            <button class="btn btn-sm btn-secondary" data-hours="168">7d</button>
                        </div>
                    </div>

                    <!-- Map Actions -->
                    <div class="form-group">
                        <div class="map-action-buttons">
                            <button class="btn btn-secondary" id="refresh-map-btn">
                                ${icons.refresh} Refresh
                            </button>
                            <button class="btn btn-secondary" id="fit-bounds-btn">
                                ${icons.navigation} Fit All
                            </button>
                            <button class="btn btn-secondary" id="clear-map-btn">
                                ${icons.x} Clear
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Playback Controls -->
                <div class="map-playback-section">
                    <h4>Timeline Playback</h4>
                    <div class="playback-controls">
                        <button class="btn btn-sm btn-primary" id="playback-prev-btn" title="Previous">
                            ◀◀
                        </button>
                        <button class="btn btn-primary" id="playback-toggle-btn" title="Play/Pause">
                            ${state.isPlaying ? icons.pause : icons.play}
                        </button>
                        <button class="btn btn-sm btn-primary" id="playback-next-btn" title="Next">
                            ▶▶
                        </button>
                    </div>
                    <div class="playback-slider-container">
                        <input type="range"
                               id="playback-slider"
                               class="playback-slider"
                               min="0"
                               max="${Math.max(0, state.mapLocations.length - 1)}"
                               value="${state.playbackIndex}">
                    </div>
                    <div class="playback-speed">
                        <label>Speed:</label>
                        <select id="playback-speed-select" class="form-select-sm">
                            <option value="2000">0.5x</option>
                            <option value="1000" selected>1x</option>
                            <option value="500">2x</option>
                            <option value="250">4x</option>
                        </select>
                    </div>
                </div>

                <!-- Location Stats -->
                <div class="map-stats-section" id="map-stats">
                    <h4>Statistics</h4>
                    <div class="stats-grid-mini">
                        <div class="stat-item-mini">
                            <span class="stat-label">Total Points</span>
                            <span class="stat-value" id="stat-total-points">${state.mapLocations.length}</span>
                        </div>
                        <div class="stat-item-mini">
                            <span class="stat-label">Distance</span>
                            <span class="stat-value" id="stat-distance">0 km</span>
                        </div>
                        <div class="stat-item-mini">
                            <span class="stat-label">Duration</span>
                            <span class="stat-value" id="stat-duration">0h</span>
                        </div>
                    </div>
                </div>

                <!-- Location List -->
                <div class="location-list-section">
                    <h4>Location History</h4>
                    <div class="location-list" id="location-list">
                        ${state.mapLocations.length > 0 ?
                            state.mapLocations.slice(0, 50).map((loc, index) => `
                                <div class="location-item ${index === state.playbackIndex ? 'active' : ''}"
                                     data-index="${index}"
                                     onclick="jumpToLocation(${index})">
                                    <div class="location-item-icon">${icons.location}</div>
                                    <div class="location-item-content">
                                        <div class="location-item-coords">
                                            ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}
                                        </div>
                                        <div class="location-item-time">
                                            ${formatDate(loc.timestamp || loc.createdAt || loc.clientTimestamp)}
                                        </div>
                                    </div>
                                </div>
                            `).join('') :
                            '<div class="empty-state-mini">No locations loaded. Enter a User ID and click Load.</div>'
                        }
                    </div>
                </div>
            </div>

            <!-- Map Container -->
            <div class="map-container-wrapper">
                <div id="location-map" class="location-map"></div>

                <!-- Current Location Info Popup -->
                <div class="map-info-overlay" id="map-info-overlay" style="display: none;">
                    <div class="map-info-content">
                        <button class="map-info-close" onclick="hideMapInfo()">×</button>
                        <h4>Location Details</h4>
                        <div id="map-info-details"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// MAP FUNCTIONS
// ============================================================================
function initializeMap() {
    if (state.map) {
        state.map.remove();
        state.map = null;
    }

    const mapContainer = document.getElementById('location-map');
    if (!mapContainer) return;

    // Initialize Leaflet map
    state.map = L.map('location-map').setView([0, 0], 2);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(state.map);

    // Add scale control
    L.control.scale({ metric: true, imperial: true }).addTo(state.map);

    // Invalidate size after a short delay to fix rendering issues
    setTimeout(() => {
        state.map.invalidateSize();
    }, 100);
}

function clearMap() {
    // Clear markers
    state.mapMarkers.forEach(marker => {
        if (state.map) state.map.removeLayer(marker);
    });
    state.mapMarkers = [];

    // Clear polylines
    state.mapPolylines.forEach(polyline => {
        if (state.map) state.map.removeLayer(polyline);
    });
    state.mapPolylines = [];

    // Reset locations
    state.mapLocations = [];
    state.playbackIndex = 0;

    // Update UI
    updateMapStats();
    updateLocationList();
}

async function loadUserLocations() {
    const userId = document.getElementById('map-user-id')?.value?.trim();
    if (!userId) {
        toast.warning('Please enter a User ID');
        return;
    }

    state.selectedMapUser = userId;

    const startDate = document.getElementById('map-start-date')?.value;
    const endDate = document.getElementById('map-end-date')?.value;

    if (startDate) state.mapDateRange.start = new Date(startDate);
    if (endDate) state.mapDateRange.end = new Date(endDate);

    const loadBtn = document.getElementById('load-map-user-btn');
    if (loadBtn) {
        loadBtn.disabled = true;
        loadBtn.innerHTML = `${icons.refresh} Loading...`;
    }

    try {
        // Try to get locations with date range
        let response;
        try {
            response = await api.getUserLocationsByDateRange(
                userId,
                state.mapDateRange.start,
                state.mapDateRange.end,
                500
            );
        } catch (e) {
            // Fallback to simple locations endpoint
            response = await api.getUserLocations(userId, 100);
        }

        if (response.success && response.locations && response.locations.length > 0) {
            state.mapLocations = response.locations.sort((a, b) => {
                const timeA = getTimestamp(a);
                const timeB = getTimestamp(b);
                return timeA - timeB;
            });

            displayLocationsOnMap();
            toast.success(`Loaded ${state.mapLocations.length} location(s)`);
        } else {
            toast.info('No locations found for this user in the selected time range');
            clearMap();
        }
    } catch (error) {
        toast.error(`Failed to load locations: ${error.message}`);
    } finally {
        if (loadBtn) {
            loadBtn.disabled = false;
            loadBtn.innerHTML = `${icons.search} Load`;
        }
    }
}

function getTimestamp(location) {
    if (location.timestamp) {
        if (location.timestamp._seconds) return location.timestamp._seconds * 1000;
        return new Date(location.timestamp).getTime();
    }
    if (location.clientTimestamp) {
        if (location.clientTimestamp._seconds) return location.clientTimestamp._seconds * 1000;
        return new Date(location.clientTimestamp).getTime();
    }
    if (location.createdAt) {
        if (location.createdAt._seconds) return location.createdAt._seconds * 1000;
        return new Date(location.createdAt).getTime();
    }
    return Date.now();
}

function displayLocationsOnMap() {
    clearMapLayers();

    if (state.mapLocations.length === 0) return;

    const bounds = L.latLngBounds([]);

    // Create path coordinates
    const pathCoords = state.mapLocations.map(loc => [loc.latitude, loc.longitude]);

    // Draw path line
    if (pathCoords.length > 1) {
        const polyline = L.polyline(pathCoords, {
            color: '#6366f1',
            weight: 3,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(state.map);
        state.mapPolylines.push(polyline);
    }

    // Add markers for each point
    state.mapLocations.forEach((loc, index) => {
        const latlng = [loc.latitude, loc.longitude];
        bounds.extend(latlng);

        // Determine marker style
        let markerOptions = {};
        if (index === 0) {
            // Start marker - green
            markerOptions = {
                icon: createCustomIcon('#22c55e', 'S'),
                title: 'Start'
            };
        } else if (index === state.mapLocations.length - 1) {
            // End marker - red
            markerOptions = {
                icon: createCustomIcon('#ef4444', 'E'),
                title: 'End (Latest)'
            };
        } else {
            // Regular point - small circle
            markerOptions = {
                icon: createCircleIcon('#6366f1', 8),
                title: `Point ${index + 1}`
            };
        }

        const marker = L.marker(latlng, markerOptions)
            .addTo(state.map)
            .bindPopup(createLocationPopup(loc, index));

        state.mapMarkers.push(marker);
    });

    // Fit map to bounds
    if (bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Update stats
    updateMapStats();
    updateLocationList();
    updatePlaybackSlider();
}

function createCustomIcon(color, label) {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
            background-color: ${color};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

function createCircleIcon(color, size) {
    return L.divIcon({
        className: 'custom-map-point',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

function createLocationPopup(location, index) {
    const time = formatDate(location.timestamp || location.createdAt || location.clientTimestamp);
    return `
        <div class="map-popup">
            <strong>Point ${index + 1}</strong><br>
            <strong>Lat:</strong> ${location.latitude.toFixed(6)}<br>
            <strong>Lng:</strong> ${location.longitude.toFixed(6)}<br>
            <strong>Time:</strong> ${time}<br>
            ${location.accuracy ? `<strong>Accuracy:</strong> ${location.accuracy}m<br>` : ''}
            ${location.speed ? `<strong>Speed:</strong> ${location.speed} m/s<br>` : ''}
            ${location.provider ? `<strong>Provider:</strong> ${location.provider}<br>` : ''}
        </div>
    `;
}

function clearMapLayers() {
    state.mapMarkers.forEach(marker => {
        if (state.map) state.map.removeLayer(marker);
    });
    state.mapMarkers = [];

    state.mapPolylines.forEach(polyline => {
        if (state.map) state.map.removeLayer(polyline);
    });
    state.mapPolylines = [];
}

function updateMapStats() {
    const totalPoints = state.mapLocations.length;
    document.getElementById('stat-total-points').textContent = totalPoints;

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < state.mapLocations.length; i++) {
        const prev = state.mapLocations[i - 1];
        const curr = state.mapLocations[i];
        totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    document.getElementById('stat-distance').textContent =
        totalDistance > 1000 ? `${(totalDistance / 1000).toFixed(2)} km` : `${Math.round(totalDistance)} m`;

    // Calculate duration
    if (state.mapLocations.length >= 2) {
        const firstTime = getTimestamp(state.mapLocations[0]);
        const lastTime = getTimestamp(state.mapLocations[state.mapLocations.length - 1]);
        const durationMs = lastTime - firstTime;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('stat-duration').textContent = `${hours}h ${minutes}m`;
    } else {
        document.getElementById('stat-duration').textContent = '0h';
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function updateLocationList() {
    const listContainer = document.getElementById('location-list');
    if (!listContainer) return;

    if (state.mapLocations.length === 0) {
        listContainer.innerHTML = '<div class="empty-state-mini">No locations loaded.</div>';
        return;
    }

    listContainer.innerHTML = state.mapLocations.slice(0, 50).map((loc, index) => `
        <div class="location-item ${index === state.playbackIndex ? 'active' : ''}"
             data-index="${index}"
             onclick="jumpToLocation(${index})">
            <div class="location-item-icon">${icons.location}</div>
            <div class="location-item-content">
                <div class="location-item-coords">
                    ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}
                </div>
                <div class="location-item-time">
                    ${formatDate(loc.timestamp || loc.createdAt || loc.clientTimestamp)}
                </div>
            </div>
        </div>
    `).join('');
}

function updatePlaybackSlider() {
    const slider = document.getElementById('playback-slider');
    if (slider) {
        slider.max = Math.max(0, state.mapLocations.length - 1);
        slider.value = state.playbackIndex;
    }
}

// Playback Functions
function startPlayback() {
    if (state.mapLocations.length < 2) {
        toast.warning('Need at least 2 locations for playback');
        return;
    }

    state.isPlaying = true;
    updatePlaybackButton();
    playNextLocation();
}

function stopPlayback() {
    state.isPlaying = false;
    updatePlaybackButton();
}

function playNextLocation() {
    if (!state.isPlaying) return;

    if (state.playbackIndex >= state.mapLocations.length - 1) {
        stopPlayback();
        return;
    }

    state.playbackIndex++;
    highlightCurrentLocation();

    setTimeout(() => {
        playNextLocation();
    }, state.playbackSpeed);
}

function highlightCurrentLocation() {
    const loc = state.mapLocations[state.playbackIndex];
    if (!loc || !state.map) return;

    // Pan to location
    state.map.panTo([loc.latitude, loc.longitude], { animate: true });

    // Update slider
    const slider = document.getElementById('playback-slider');
    if (slider) slider.value = state.playbackIndex;

    // Update location list highlighting
    document.querySelectorAll('.location-item').forEach((item, index) => {
        item.classList.toggle('active', index === state.playbackIndex);
    });

    // Open popup on current marker
    if (state.mapMarkers[state.playbackIndex]) {
        state.mapMarkers[state.playbackIndex].openPopup();
    }
}

function updatePlaybackButton() {
    const btn = document.getElementById('playback-toggle-btn');
    if (btn) {
        btn.innerHTML = state.isPlaying ? icons.pause : icons.play;
    }
}

// Global window functions for onclick handlers
window.jumpToLocation = function(index) {
    state.playbackIndex = index;
    highlightCurrentLocation();
};

window.hideMapInfo = function() {
    const overlay = document.getElementById('map-info-overlay');
    if (overlay) overlay.style.display = 'none';
};

function attachMapEventListeners() {
    // Load user button
    document.getElementById('load-map-user-btn')?.addEventListener('click', loadUserLocations);

    // Enter key on user ID input
    document.getElementById('map-user-id')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUserLocations();
    });

    // Refresh button
    document.getElementById('refresh-map-btn')?.addEventListener('click', () => {
        if (state.selectedMapUser) {
            loadUserLocations();
        } else {
            toast.info('Enter a User ID first');
        }
    });

    // Clear button
    document.getElementById('clear-map-btn')?.addEventListener('click', () => {
        clearMap();
        toast.info('Map cleared');
    });

    // Fit bounds button
    document.getElementById('fit-bounds-btn')?.addEventListener('click', () => {
        if (state.mapLocations.length > 0) {
            const bounds = L.latLngBounds(
                state.mapLocations.map(loc => [loc.latitude, loc.longitude])
            );
            state.map.fitBounds(bounds, { padding: [50, 50] });
        }
    });

    // Quick date buttons
    document.querySelectorAll('.quick-date-buttons button').forEach(btn => {
        btn.addEventListener('click', () => {
            const hours = parseInt(btn.dataset.hours);
            const now = new Date();
            const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

            state.mapDateRange.start = start;
            state.mapDateRange.end = now;

            document.getElementById('map-start-date').value = start.toISOString().slice(0, 16);
            document.getElementById('map-end-date').value = now.toISOString().slice(0, 16);

            // Update active state
            document.querySelectorAll('.quick-date-buttons button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Reload if user selected
            if (state.selectedMapUser) {
                loadUserLocations();
            }
        });
    });

    // Playback controls
    document.getElementById('playback-toggle-btn')?.addEventListener('click', () => {
        if (state.isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    });

    document.getElementById('playback-prev-btn')?.addEventListener('click', () => {
        if (state.playbackIndex > 0) {
            state.playbackIndex--;
            highlightCurrentLocation();
        }
    });

    document.getElementById('playback-next-btn')?.addEventListener('click', () => {
        if (state.playbackIndex < state.mapLocations.length - 1) {
            state.playbackIndex++;
            highlightCurrentLocation();
        }
    });

    document.getElementById('playback-slider')?.addEventListener('input', (e) => {
        state.playbackIndex = parseInt(e.target.value);
        highlightCurrentLocation();
    });

    document.getElementById('playback-speed-select')?.addEventListener('change', (e) => {
        state.playbackSpeed = parseInt(e.target.value);
    });
}

// ============================================================================
// MODALS
// ============================================================================
function renderModals() {
    return `
        <div class="modal-overlay hidden" id="confirm-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
                    <button class="modal-close" onclick="closeModal('confirm-modal')">&times;</button>
                </div>
                <div class="modal-body" id="confirm-modal-body">
                    Are you sure you want to proceed?
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('confirm-modal')">Cancel</button>
                    <button class="btn btn-primary" id="confirm-modal-btn">Confirm</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay hidden" id="duration-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Set Duration</h3>
                    <button class="modal-close" onclick="closeModal('duration-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Duration (seconds)</label>
                        <input type="number" id="duration-input" class="form-input" min="1" value="3600">
                        <p class="form-hint">Leave empty to use default duration</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quick Select</label>
                        <select class="form-select" id="duration-quick-select">
                            <option value="">Custom</option>
                            <option value="300">5 minutes</option>
                            <option value="900">15 minutes</option>
                            <option value="1800">30 minutes</option>
                            <option value="3600">1 hour</option>
                            <option value="7200">2 hours</option>
                            <option value="14400">4 hours</option>
                            <option value="28800">8 hours</option>
                            <option value="86400">24 hours</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('duration-modal')">Cancel</button>
                    <button class="btn btn-success" id="duration-modal-btn">Enable Mode</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function attachEventListeners() {
    // Navigation
    document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.currentPage = e.currentTarget.dataset.page;
            renderApp();
        });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await logout();
        state.user = null;
        state.loadedUsers.clear();
        renderLoginPage();
    });

    // Refresh
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        if (state.currentPage === 'users') {
            refreshAllUsers();
        } else if (state.currentPage === 'map' && state.selectedMapUser) {
            loadUserLocations();
        } else {
            renderApp();
        }
    });

    // Load users
    document.getElementById('load-users-btn')?.addEventListener('click', loadUsers);
    document.getElementById('user-ids-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUsers();
    });

    // Broadcast
    document.getElementById('broadcast-btn')?.addEventListener('click', handleBroadcast);

    // Duration quick select
    document.getElementById('duration-quick-select')?.addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('duration-input').value = e.target.value;
        }
    });

    // Initialize map if on map page
    if (state.currentPage === 'map') {
        setTimeout(() => {
            initializeMap();
            attachMapEventListeners();
        }, 50);
    }
}

// ============================================================================
// API HANDLERS
// ============================================================================
async function loadUsers() {
    const input = document.getElementById('user-ids-input')?.value;
    if (!input) {
        toast.warning('Please enter at least one User ID');
        return;
    }

    const userIds = parseUserIds(input);
    if (userIds.length === 0) {
        toast.warning('No valid User IDs found');
        return;
    }

    const loadBtn = document.getElementById('load-users-btn');
    loadBtn.disabled = true;
    loadBtn.innerHTML = `${icons.refresh} Loading...`;

    for (const userId of userIds) {
        if (!isValidUserId(userId)) {
            state.loadedUsers.set(userId, { error: 'Invalid User ID format' });
            continue;
        }

        try {
            const response = await api.adminGetUserSettings(userId);
            state.loadedUsers.set(userId, { settings: response.settings });
        } catch (error) {
            state.loadedUsers.set(userId, { error: error.message });
        }
    }

    loadBtn.disabled = false;
    loadBtn.innerHTML = `${icons.search} Load Settings`;

    document.getElementById('users-container').innerHTML = renderLoadedUsers();
    toast.success(`Loaded ${userIds.length} user(s)`);
}

async function refreshUser(userId) {
    try {
        const response = await api.adminGetUserSettings(userId);
        state.loadedUsers.set(userId, { settings: response.settings });
        document.getElementById('users-container').innerHTML = renderLoadedUsers();
        toast.success('Settings refreshed');
    } catch (error) {
        toast.error(`Failed to refresh: ${error.message}`);
    }
}

async function refreshAllUsers() {
    const userIds = Array.from(state.loadedUsers.keys());
    for (const userId of userIds) {
        try {
            const response = await api.adminGetUserSettings(userId);
            state.loadedUsers.set(userId, { settings: response.settings });
        } catch (error) {
            state.loadedUsers.set(userId, { error: error.message });
        }
    }
    document.getElementById('users-container').innerHTML = renderLoadedUsers();
    toast.success('All users refreshed');
}

// Global functions for onclick handlers
window.removeUser = function(userId) {
    state.loadedUsers.delete(userId);
    document.getElementById('users-container').innerHTML =
        state.loadedUsers.size > 0 ? renderLoadedUsers() : renderEmptyState();
};

window.saveUserSettings = async function(userId) {
    const panel = document.querySelector(`[data-user-id="${userId}"]`);
    const inputs = panel.querySelectorAll('.setting-input');

    const settings = {};
    inputs.forEach(input => {
        const key = input.dataset.settingKey;
        settings[key] = parseInt(input.value, 10);
    });

    try {
        await api.adminUpdateUserSettings(userId, settings);
        toast.success('Settings saved successfully');
        refreshUser(userId);
    } catch (error) {
        toast.error(`Failed to save: ${error.message}`);
    }
};

window.refreshUser = refreshUser;

window.resetUserSettings = async function(userId) {
    if (!confirm('Are you sure you want to reset this user\'s settings to defaults?')) return;

    try {
        // Get defaults and apply to user
        const defaultSettings = state.defaults;
        await api.adminUpdateUserSettings(userId, defaultSettings);
        toast.success('Settings reset to defaults');
        refreshUser(userId);
    } catch (error) {
        toast.error(`Failed to reset: ${error.message}`);
    }
};

window.enableMode = async function(userId, mode) {
    // Show duration modal
    const modal = document.getElementById('duration-modal');
    modal.classList.remove('hidden');

    const btn = document.getElementById('duration-modal-btn');
    btn.onclick = async () => {
        const duration = document.getElementById('duration-input').value;
        modal.classList.add('hidden');

        try {
            // Build settings update
            const modeSettings = {};
            if (mode === 'force') {
                modeSettings.forceCheckEnabled = true;
                if (duration) modeSettings.forceCheckDuration = parseInt(duration, 10);
            } else if (mode === 'realtime') {
                modeSettings.realtimeModeEnabled = true;
                if (duration) modeSettings.realtimeModeDuration = parseInt(duration, 10);
            } else if (mode === 'emergency') {
                modeSettings.emergencyModeEnabled = true;
                if (duration) modeSettings.emergencyModeDuration = parseInt(duration, 10);
            }

            await api.adminUpdateUserSettings(userId, modeSettings);
            toast.success(`${mode} mode enabled`);
            refreshUser(userId);
        } catch (error) {
            toast.error(`Failed to enable mode: ${error.message}`);
        }
    };
};

window.disableMode = async function(userId, mode) {
    try {
        const modeSettings = {};
        if (mode === 'force') modeSettings.forceCheckEnabled = false;
        else if (mode === 'realtime') modeSettings.realtimeModeEnabled = false;
        else if (mode === 'emergency') modeSettings.emergencyModeEnabled = false;

        await api.adminUpdateUserSettings(userId, modeSettings);
        toast.success(`${mode} mode disabled`);
        refreshUser(userId);
    } catch (error) {
        toast.error(`Failed to disable mode: ${error.message}`);
    }
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
};

async function handleBroadcast() {
    const reason = document.getElementById('broadcast-reason')?.value || 'Admin broadcast';

    const settings = {};
    const settingKeys = ['updateInterval', 'forceCheckInterval', 'realtimeInterval', 'emergencyInterval', 'batteryThreshold', 'batchUploadSize'];

    let hasSettings = false;
    for (const key of settingKeys) {
        const enabled = document.getElementById(`broadcast-${key}-enabled`)?.checked;
        if (enabled) {
            const value = parseInt(document.getElementById(`broadcast-${key}`)?.value, 10);
            if (!isNaN(value)) {
                settings[key] = value;
                hasSettings = true;
            }
        }
    }

    if (!hasSettings) {
        toast.warning('Please enable at least one setting to broadcast');
        return;
    }

    if (!confirm(`Are you sure you want to broadcast these settings to ALL users?\n\nReason: ${reason}`)) {
        return;
    }

    try {
        const result = await api.adminBroadcastSettings(settings, reason);
        toast.success(`Broadcast complete! Updated ${result.updatedCount || 'all'} users.`);
    } catch (error) {
        toast.error(`Broadcast failed: ${error.message}`);
    }
}

