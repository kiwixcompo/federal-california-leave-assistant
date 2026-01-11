<?php
/**
 * GitHub Auto-Deploy Script for hrleaveassist.com (Optimized for Shared Hosting)
 * 
 * This script automatically pulls the latest changes from GitHub
 * when triggered by a webhook or manual execution.
 * Optimized to prevent timeouts on shared hosting.
 */

// Prevent timeouts and optimize for shared hosting
set_time_limit(300); // 5 minutes max
ini_set('max_execution_time', 300);
ini_set('memory_limit', '256M');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration
$config = [
    'repo_url' => 'https://github.com/kiwixcompo/federal-california-leave-assistant.git',
    'branch' => 'main',
    'deploy_path' => __DIR__, // Current directory where this script is located
    'secret_key' => 'HRLeaveAssist2026SecureKey!@#$%', // Secure webhook secret
    'log_file' => __DIR__ . '/deploy.log',
    'backup_dir' => __DIR__ . '/backups',
    'allowed_ips' => [
        '140.82.112.0/20',    // GitHub webhook IPs
        '185.199.108.0/22',   // GitHub webhook IPs
        '192.30.252.0/22',    // GitHub webhook IPs
        '127.0.0.1',          // Localhost for manual testing
    ]
];

// Security check for webhook requests
function isValidRequest($config) {
    // For manual requests, allow them (we'll add basic auth later if needed)
    if (isset($_GET['manual']) && $_GET['manual'] === 'true') {
        return true;
    }
    
    // For webhook requests, verify signature
    if (isset($_SERVER['HTTP_X_HUB_SIGNATURE_256'])) {
        $payload = file_get_contents('php://input');
        $signature = hash_hmac('sha256', $payload, $config['secret_key']);
        $expected_signature = 'sha256=' . $signature;
        
        if (!hash_equals($expected_signature, $_SERVER['HTTP_X_HUB_SIGNATURE_256'])) {
            return false;
        }
    }
    
    return true;
}

// Logging function
function logMessage($message, $config) {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] $message" . PHP_EOL;
    @file_put_contents($config['log_file'], $log_entry, FILE_APPEND | LOCK_EX);
}

// Output progress and flush buffer (prevents timeouts)
function outputProgress($message) {
    echo "<div class='status info'>$message</div>";
    if (ob_get_level()) {
        ob_flush();
    }
    flush();
}

// Create backup before deployment (simplified for shared hosting)
function createBackup($config) {
    try {
        if (!is_dir($config['backup_dir'])) {
            if (!mkdir($config['backup_dir'], 0755, true)) {
                logMessage("Failed to create backup directory", $config);
                return false;
            }
        }
        
        $backup_name = 'backup_' . date('Y-m-d_H-i-s') . '.txt';
        $backup_path = $config['backup_dir'] . '/' . $backup_name;
        
        // Simple backup - just log the current state
        $backup_info = [
            'timestamp' => date('Y-m-d H:i:s'),
            'files_count' => count(glob('*')),
            'directory' => getcwd()
        ];
        
        file_put_contents($backup_path, json_encode($backup_info, JSON_PRETTY_PRINT));
        logMessage("Backup created: $backup_name", $config);
        
        // Keep only last 5 backups (reduced to save space)
        $backups = glob($config['backup_dir'] . '/backup_*.txt');
        if (count($backups) > 5) {
            usort($backups, function($a, $b) {
                return filemtime($b) - filemtime($a);
            });
            for ($i = 5; $i < count($backups); $i++) {
                @unlink($backups[$i]);
            }
        }
        
        return true;
    } catch (Exception $e) {
        logMessage("Backup failed: " . $e->getMessage(), $config);
        return false;
    }
}

// Main deployment function using GitHub API
function deployWithGitHubAPI($config, $is_manual = false) {
    logMessage("=== DEPLOYMENT STARTED (Optimized GitHub API Method) ===", $config);
    
    if ($is_manual) outputProgress("📋 Creating backup...");
    createBackup($config);
    
    // Try multiple GitHub API endpoints
    $api_urls = [
        "https://api.github.com/repos/kiwixcompo/federal-california-leave-assistant/zipball/{$config['branch']}",
        "https://github.com/kiwixcompo/federal-california-leave-assistant/archive/refs/heads/{$config['branch']}.zip"
    ];
    
    $zip_content = false;
    $successful_url = null;
    
    foreach ($api_urls as $api_url) {
        logMessage("Attempting download from: $api_url", $config);
        if ($is_manual) outputProgress("📦 Trying to download from GitHub... (Method " . (array_search($api_url, $api_urls) + 1) . ")");
        
        // Create context with better error handling
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: HRLeaveAssist-Deploy/1.0',
                    'Accept: application/vnd.github.v3+json',
                    'Connection: close'
                ],
                'timeout' => 45,
                'ignore_errors' => true
            ]
        ]);
        
        // Attempt download
        $zip_content = @file_get_contents($api_url, false, $context);
        
        if ($zip_content !== false && strlen($zip_content) > 1000) {
            $successful_url = $api_url;
            logMessage("Successfully downloaded from: $api_url (" . number_format(strlen($zip_content)) . " bytes)", $config);
            break;
        } else {
            // Log the specific error
            $error = error_get_last();
            $http_response_header_info = isset($http_response_header) ? implode(', ', $http_response_header) : 'No response headers';
            logMessage("Download failed from $api_url - Error: " . ($error['message'] ?? 'Unknown') . " - Headers: $http_response_header_info", $config);
            
            if ($is_manual) {
                outputProgress("❌ Failed to download from method " . (array_search($api_url, $api_urls) + 1));
            }
        }
    }
    
    if ($zip_content === false) {
        logMessage("ERROR: Failed to download repository from all GitHub sources", $config);
        if ($is_manual) outputProgress("❌ All download methods failed. Check internet connectivity and repository access.");
        
        // Try to provide more specific error information
        $curl_available = function_exists('curl_init');
        $allow_url_fopen = ini_get('allow_url_fopen');
        
        logMessage("Debug info - CURL available: " . ($curl_available ? 'Yes' : 'No') . ", allow_url_fopen: " . ($allow_url_fopen ? 'Yes' : 'No'), $config);
        
        if ($is_manual) {
            outputProgress("🔍 Debug info: CURL=" . ($curl_available ? 'Available' : 'Not available') . ", URL fopen=" . ($allow_url_fopen ? 'Enabled' : 'Disabled'));
        }
        
        return false;
    }
    
    if ($is_manual) outputProgress("✅ Successfully downloaded " . number_format(strlen($zip_content)) . " bytes from GitHub");
    
    // Save ZIP file temporarily
    $temp_zip = $config['deploy_path'] . '/temp_deploy.zip';
    if (file_put_contents($temp_zip, $zip_content) === false) {
        logMessage("ERROR: Failed to save temporary ZIP file", $config);
        if ($is_manual) outputProgress("❌ Failed to save download to temporary file");
        return false;
    }
    
    logMessage("Repository downloaded successfully from $successful_url (" . number_format(strlen($zip_content)) . " bytes), extracting files", $config);
    if ($is_manual) outputProgress("📂 Extracting files...");
    
    // Verify ZIP file integrity
    if (!class_exists('ZipArchive')) {
        logMessage("ERROR: ZipArchive class not available", $config);
        if ($is_manual) outputProgress("❌ ZipArchive not available on this server");
        @unlink($temp_zip);
        return false;
    }
    
    $zip = new ZipArchive;
    $zip_result = $zip->open($temp_zip);
    
    if ($zip_result !== TRUE) {
        logMessage("ERROR: Failed to open ZIP file - Error code: $zip_result", $config);
        if ($is_manual) outputProgress("❌ Failed to open ZIP file (Error: $zip_result)");
        @unlink($temp_zip);
        return false;
    }
    
    // Extract to temporary directory
    $temp_dir = $config['deploy_path'] . '/temp_extract';
    if (!is_dir($temp_dir)) {
        mkdir($temp_dir, 0755, true);
    }
    
    if (!$zip->extractTo($temp_dir)) {
        logMessage("ERROR: Failed to extract ZIP file", $config);
        if ($is_manual) outputProgress("❌ Failed to extract ZIP file");
        $zip->close();
        @unlink($temp_zip);
        return false;
    }
    
    $zip->close();
    
    if ($is_manual) outputProgress("📁 Copying files to website directory...");
    
    // Find the extracted folder (GitHub creates a folder with commit hash)
    $extracted_folders = glob($temp_dir . '/*', GLOB_ONLYDIR);
    if (empty($extracted_folders)) {
        logMessage("ERROR: No extracted folder found", $config);
        if ($is_manual) outputProgress("❌ No extracted folder found");
        @unlink($temp_zip);
        removeDirectoryOptimized($temp_dir);
        return false;
    }
    
    $source_dir = $extracted_folders[0];
    logMessage("Found extracted directory: $source_dir", $config);
    
    // Copy files from extracted folder to deployment directory (optimized)
    if (copyDirectoryOptimized($source_dir, $config['deploy_path'], $is_manual)) {
        logMessage("Files copied successfully", $config);
        
        if ($is_manual) outputProgress("🔧 Setting up directories and permissions...");
        
        // Ensure data directory exists and is writable
        if (!is_dir('data')) {
            @mkdir('data', 0755, true);
        }
        @chmod('data', 0755);
        
        // Set basic permissions
        @chmod('.', 0755);
        
        // Clean up temporary files
        @unlink($temp_zip);
        removeDirectoryOptimized($temp_dir);
        
        logMessage("=== DEPLOYMENT COMPLETED SUCCESSFULLY ===", $config);
        if ($is_manual) outputProgress("✅ Deployment completed successfully!");
        return true;
    } else {
        logMessage("ERROR: Failed to copy files", $config);
        if ($is_manual) outputProgress("❌ Failed to copy files");
        @unlink($temp_zip);
        removeDirectoryOptimized($temp_dir);
        return false;
    }
}

// Optimized copy directory function with progress updates
function copyDirectoryOptimized($source, $destination, $is_manual = false) {
    if (!is_dir($source)) {
        return false;
    }
    
    $files_copied = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    foreach ($iterator as $item) {
        $target = $destination . DIRECTORY_SEPARATOR . $iterator->getSubPathName();
        
        if ($item->isDir()) {
            if (!is_dir($target)) {
                @mkdir($target, 0755, true);
            }
        } else {
            // Skip certain files
            $filename = basename($target);
            if (in_array($filename, ['deploy.php', 'deploy.log']) || 
                strpos($target, '/backups/') !== false ||
                strpos($target, '/.git/') !== false ||
                strpos($target, '/node_modules/') !== false) {
                continue;
            }
            
            @copy($item, $target);
            $files_copied++;
            
            // Output progress every 50 files to prevent timeout
            if ($is_manual && $files_copied % 50 === 0) {
                outputProgress("📄 Copied $files_copied files...");
            }
        }
    }
    
    if ($is_manual) {
        outputProgress("📄 Total files copied: $files_copied");
    }
    
    return true;
}

// Optimized remove directory function
function removeDirectoryOptimized($dir) {
    if (!is_dir($dir)) {
        return false;
    }
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    
    foreach ($iterator as $item) {
        if ($item->isDir()) {
            @rmdir($item);
        } else {
            @unlink($item);
        }
    }
    @rmdir($dir);
    return true;
}

// Handle the request
try {
    // Security check
    if (!isValidRequest($config)) {
        http_response_code(403);
        logMessage("ERROR: Unauthorized deployment attempt from " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), $config);
        die('Unauthorized');
    }
    
    // Check if this is a manual trigger or webhook
    $is_manual = isset($_GET['manual']) && $_GET['manual'] === 'true';
    $is_webhook = isset($_SERVER['HTTP_X_GITHUB_EVENT']);
    
    if ($is_manual) {
        logMessage("Manual deployment triggered", $config);
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>HR Leave Assist - Deployment</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background: #f8f9fa; }
                .header { background: #0023F5; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
                .status { padding: 12px 15px; border-radius: 6px; margin: 8px 0; border-left: 4px solid; }
                .success { background: #d4edda; color: #155724; border-left-color: #28a745; }
                .error { background: #f8d7da; color: #721c24; border-left-color: #dc3545; }
                .info { background: #d1ecf1; color: #0c5460; border-left-color: #17a2b8; }
                .log { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
                .links { margin-top: 20px; text-align: center; }
                .links a { display: inline-block; margin: 5px 10px; padding: 10px 20px; background: #0023F5; color: white; text-decoration: none; border-radius: 5px; transition: background 0.3s; }
                .links a:hover { background: #0322D8; }
                .progress { margin: 20px 0; }
                .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #0023F5; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 HR Leave Assist - Auto Deployment</h1>
                <p>Repository: kiwixcompo/federal-california-leave-assistant</p>
                <p><small>Branch: <?php echo htmlspecialchars($config['branch']); ?></small></p>
            </div>
            
            <div class="progress">
                <div class="status info">
                    <span class="spinner"></span>
                    <strong>📋 Deployment Status:</strong> Starting optimized deployment process...
                </div>
            </div>
            
            <?php
            // Start output buffering and flush immediately
            if (ob_get_level()) {
                ob_end_flush();
            }
            ob_start();
            flush();
            
            // Perform deployment using optimized GitHub API method
            outputProgress("🔧 Initializing deployment system...");
            outputProgress("📦 Using optimized GitHub API deployment method...");
            
            $start_time = microtime(true);
            $success = deployWithGitHubAPI($config, true);
            $end_time = microtime(true);
            $duration = round($end_time - $start_time, 2);
            
            if ($success) {
                echo '<div class="status success"><strong>✅ Success!</strong> Deployment completed successfully in ' . $duration . ' seconds!</div>';
                echo '<div class="status info">🌐 Your HR Leave Assistant website has been updated with the latest changes from GitHub.</div>';
                echo '<div class="status info">🔄 The website should now reflect the most recent code changes.</div>';
            } else {
                echo '<div class="status error"><strong>❌ Failed!</strong> Deployment encountered errors after ' . $duration . ' seconds.</div>';
                echo '<div class="status info">📋 Check the deployment log below for details.</div>';
            }
            
            // Show log file contents
            if (file_exists($config['log_file'])) {
                $log_content = file_get_contents($config['log_file']);
                $recent_logs = implode("\n", array_slice(explode("\n", $log_content), -30)); // Last 30 lines
                echo '<h3>📋 Recent Deployment Log:</h3>';
                echo '<div class="log">' . htmlspecialchars($recent_logs) . '</div>';
            }
            ?>
            
            <div class="links">
                <a href="/">🌐 View Website</a>
                <a href="?manual=true">🔄 Deploy Again</a>
                <a href="https://github.com/kiwixcompo/federal-california-leave-assistant">📊 View Repository</a>
            </div>
            
            <div class="status info" style="margin-top: 20px; font-size: 0.9em;">
                <strong>💡 Tip:</strong> If you see any issues, wait a few minutes for file system changes to propagate, then refresh your website.
            </div>
        </body>
        </html>
        <?php
    } elseif ($is_webhook) {
        $event = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? 'unknown';
        logMessage("Webhook deployment triggered: $event", $config);
        
        // Only deploy on push events to main branch
        if ($event !== 'push') {
            logMessage("Ignoring non-push event: $event", $config);
            echo "OK - Event ignored";
            exit;
        }
        
        // Parse payload to check branch
        $payload = json_decode(file_get_contents('php://input'), true);
        if (isset($payload['ref']) && $payload['ref'] !== 'refs/heads/' . $config['branch']) {
            logMessage("Ignoring push to non-main branch: " . $payload['ref'], $config);
            echo "OK - Branch ignored";
            exit;
        }
        
        // Perform deployment using optimized GitHub API method
        $success = deployWithGitHubAPI($config, false);
        
        if ($success) {
            echo "OK - Deployment successful";
            logMessage("Webhook deployment completed successfully", $config);
        } else {
            http_response_code(500);
            echo "ERROR - Deployment failed";
            logMessage("Webhook deployment failed", $config);
        }
    } else {
        logMessage("ERROR: Invalid request method", $config);
        http_response_code(400);
        die('Invalid request');
    }
} catch (Exception $e) {
    logMessage("EXCEPTION: " . $e->getMessage(), $config);
    if (isset($is_manual) && $is_manual) {
        echo '<div class="status error"><strong>❌ Exception:</strong> ' . htmlspecialchars($e->getMessage()) . '</div>';
    } else {
        http_response_code(500);
        echo "ERROR - Exception occurred: " . $e->getMessage();
    }
}
?>