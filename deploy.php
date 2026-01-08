<?php
/**
 * GitHub Auto-Deploy Script for hrleaveassist.com
 * 
 * This script automatically pulls the latest changes from GitHub
 * when triggered by a webhook or manual execution.
 */

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

// Check if command exists (simplified for shared hosting)
function commandExists($command) {
    // On shared hosting with disabled exec functions, assume Git is not available
    return false;
}

// Execute command safely (not available on this hosting)
function executeCommand($command, $config) {
    logMessage("Command execution not available on this hosting: $command", $config);
    return ['output' => [], 'return_code' => 1, 'output_str' => 'Command execution disabled'];
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
        
        // Keep only last 10 backups
        $backups = glob($config['backup_dir'] . '/backup_*.txt');
        if (count($backups) > 10) {
            usort($backups, function($a, $b) {
                return filemtime($b) - filemtime($a);
            });
            for ($i = 10; $i < count($backups); $i++) {
                @unlink($backups[$i]);
            }
        }
        
        return true;
    } catch (Exception $e) {
        logMessage("Backup failed: " . $e->getMessage(), $config);
        return false;
    }
}

// Main deployment function using GitHub API (for shared hosting without Git)
function deployWithGitHubAPI($config) {
    logMessage("=== DEPLOYMENT STARTED (GitHub API Method) ===", $config);
    
    // Create backup
    createBackup($config);
    
    // GitHub API URL to get repository contents
    $api_url = "https://api.github.com/repos/kiwixcompo/federal-california-leave-assistant/zipball/{$config['branch']}";
    logMessage("Downloading repository from GitHub API", $config);
    
    // Download the repository as a ZIP file
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: HRLeaveAssist-Deploy/1.0'
            ],
            'timeout' => 60
        ]
    ]);
    
    $zip_content = @file_get_contents($api_url, false, $context);
    if ($zip_content === false) {
        logMessage("ERROR: Failed to download repository from GitHub", $config);
        return false;
    }
    
    // Save ZIP file temporarily
    $temp_zip = $config['deploy_path'] . '/temp_deploy.zip';
    if (file_put_contents($temp_zip, $zip_content) === false) {
        logMessage("ERROR: Failed to save temporary ZIP file", $config);
        return false;
    }
    
    logMessage("Repository downloaded successfully, extracting files", $config);
    
    // Extract ZIP file
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive;
        if ($zip->open($temp_zip) === TRUE) {
            // Extract to temporary directory
            $temp_dir = $config['deploy_path'] . '/temp_extract';
            if (!is_dir($temp_dir)) {
                mkdir($temp_dir, 0755, true);
            }
            
            $zip->extractTo($temp_dir);
            $zip->close();
            
            // Find the extracted folder (GitHub creates a folder with commit hash)
            $extracted_folders = glob($temp_dir . '/*', GLOB_ONLYDIR);
            if (empty($extracted_folders)) {
                logMessage("ERROR: No extracted folder found", $config);
                @unlink($temp_zip);
                return false;
            }
            
            $source_dir = $extracted_folders[0];
            
            // Copy files from extracted folder to deployment directory
            if (copyDirectory($source_dir, $config['deploy_path'])) {
                logMessage("Files copied successfully", $config);
                
                // Ensure data directory exists and is writable
                if (!is_dir('data')) {
                    @mkdir('data', 0755, true);
                }
                @chmod('data', 0755);
                
                // Set basic permissions
                @chmod('.', 0755);
                
                // Clean up temporary files
                @unlink($temp_zip);
                removeDirectory($temp_dir);
                
                logMessage("=== DEPLOYMENT COMPLETED SUCCESSFULLY ===", $config);
                return true;
            } else {
                logMessage("ERROR: Failed to copy files", $config);
                @unlink($temp_zip);
                removeDirectory($temp_dir);
                return false;
            }
        } else {
            logMessage("ERROR: Failed to open ZIP file", $config);
            @unlink($temp_zip);
            return false;
        }
    } else {
        logMessage("ERROR: ZipArchive class not available", $config);
        @unlink($temp_zip);
        return false;
    }
}

// Copy directory recursively
function copyDirectory($source, $destination) {
    if (!is_dir($source)) {
        return false;
    }
    
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
                strpos($target, '/.git/') !== false) {
                continue;
            }
            @copy($item, $target);
        }
    }
    
    return true;
}

// Remove directory recursively
function removeDirectory($dir) {
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
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                .header { background: #0023F5; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                .status { padding: 15px; border-radius: 5px; margin: 10px 0; }
                .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                .log { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
                .links { margin-top: 20px; }
                .links a { display: inline-block; margin-right: 15px; padding: 10px 15px; background: #0023F5; color: white; text-decoration: none; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 HR Leave Assist - Auto Deployment</h1>
                <p>Repository: https://github.com/kiwixcompo/federal-california-leave-assistant</p>
            </div>
            
            <div class="status info">
                <strong>📋 Deployment Status:</strong> Starting manual deployment...
            </div>
            
            <?php
            flush();
            
            // Perform deployment using GitHub API method
            echo '<div class="status info">📦 Using GitHub API deployment method...</div>';
            flush();
            
            $success = deployWithGitHubAPI($config);
            
            if ($success) {
                echo '<div class="status success"><strong>✅ Success!</strong> Deployment completed successfully!</div>';
                echo '<div class="status info">Your HR Leave Assistant website has been updated with the latest changes from GitHub.</div>';
            } else {
                echo '<div class="status error"><strong>❌ Failed!</strong> Deployment encountered errors.</div>';
                echo '<div class="status info">Check the deployment log below for details.</div>';
            }
            
            // Show log file contents
            if (file_exists($config['log_file'])) {
                $log_content = file_get_contents($config['log_file']);
                $recent_logs = implode("\n", array_slice(explode("\n", $log_content), -20)); // Last 20 lines
                echo '<h3>📋 Recent Deployment Log:</h3>';
                echo '<div class="log">' . htmlspecialchars($recent_logs) . '</div>';
            }
            ?>
            
            <div class="links">
                <a href="/">🌐 View Website</a>
                <a href="?manual=true">🔄 Deploy Again</a>
                <a href="https://github.com/kiwixcompo/federal-california-leave-assistant">📊 View Repository</a>
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
        
        // Perform deployment using GitHub API method
        $success = deployWithGitHubAPI($config);
        
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