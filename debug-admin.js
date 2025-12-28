// Debug script for admin dashboard
console.log('🔧 Admin Dashboard Debug Script Loaded');

// Function to check current state
function checkAdminState() {
    console.log('=== ADMIN STATE CHECK ===');
    
    // Check localStorage
    const currentUser = localStorage.getItem('currentUser');
    const users = localStorage.getItem('users');
    const pendingVerifications = localStorage.getItem('pendingVerifications');
    
    console.log('📦 LocalStorage Data:');
    console.log('  Current User:', currentUser ? JSON.parse(currentUser) : 'None');
    console.log('  All Users:', users ? JSON.parse(users) : 'None');
    console.log('  Pending Verifications:', pendingVerifications ? JSON.parse(pendingVerifications) : 'None');
    
    // Check if app exists
    if (typeof app !== 'undefined') {
        console.log('🚀 App Instance:');
        console.log('  Current User:', app.currentUser);
        console.log('  Users Array:', app.users);
        console.log('  Pending Verifications:', app.pendingVerifications);
        console.log('  Is Admin?', app.currentUser?.isAdmin);
    } else {
        console.log('❌ App instance not found');
    }
    
    // Check DOM elements
    console.log('🏗️ DOM Elements:');
    console.log('  Admin Dashboard:', document.getElementById('adminDashboard') ? 'Found' : 'Missing');
    console.log('  Users List:', document.getElementById('usersList') ? 'Found' : 'Missing');
    console.log('  Pending List:', document.getElementById('pendingList') ? 'Found' : 'Missing');
    console.log('  Total Users:', document.getElementById('totalUsers') ? 'Found' : 'Missing');
    
    console.log('=== END STATE CHECK ===');
}

// Function to force admin login
function forceAdminLogin() {
    console.log('👑 Forcing admin login...');
    
    const adminUser = {
        id: '1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'talk2char@gmail.com',
        password: 'Password@123',
        isAdmin: true,
        emailVerified: true,
        hasAccess: true,
        openaiApiKey: 'demo'
    };
    
    // Save to localStorage
    localStorage.setItem('users', JSON.stringify([adminUser]));
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    
    // Update app instance if it exists
    if (typeof app !== 'undefined') {
        app.currentUser = adminUser;
        app.users = [adminUser];
        console.log('✅ App instance updated');
        
        // Force show admin dashboard
        app.showDashboard();
    } else {
        console.log('⚠️ App instance not found, reloading page...');
        location.reload();
    }
}

// Function to test admin dashboard loading
function testAdminDashboard() {
    console.log('🧪 Testing admin dashboard...');
    
    if (typeof app === 'undefined') {
        console.log('❌ App not loaded');
        return;
    }
    
    if (!app.currentUser?.isAdmin) {
        console.log('⚠️ Not logged in as admin, forcing admin login...');
        forceAdminLogin();
        return;
    }
    
    try {
        console.log('🔄 Loading admin dashboard...');
        app.loadAdminDashboard();
        console.log('✅ Admin dashboard load completed');
    } catch (error) {
        console.error('❌ Error loading admin dashboard:', error);
    }
}

// Make functions globally available
window.checkAdminState = checkAdminState;
window.forceAdminLogin = forceAdminLogin;
window.testAdminDashboard = testAdminDashboard;

console.log('💡 Available debug functions:');
console.log('  - checkAdminState() - Check current state');
console.log('  - forceAdminLogin() - Force admin login');
console.log('  - testAdminDashboard() - Test admin dashboard loading');

// Auto-check state on load
setTimeout(checkAdminState, 1000);