<?php
/**
 * GitHub Download Debug Script
 * Visit: https://hrleaveassist.com/debug-github.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>GitHub Download Debug</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; }
        .header { background: #0023F5; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .test { padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }
        .pass { background: #d4edda; color: #155724; border-left-color: #28a745; }
        .fail { background: #f8d7da; color: #721c24; border-left-color: #dc3545; }
        .info { background: #d1ecf1; color: #0c5460; border-left-color: #17a2b8; }
        .code { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 GitHub Download Debug</h1>
        <p>Diagnosing GitHub repository download issues</p>
    </div>

    <?php
    $urls_to_test = [
        'GitHub API (Primary)' => 'https://api.github.com/repos/kiwixcompo/federal-california-leave-assistant/zipball/main',
        'GitHub Archive (Fallback)' => 'https://github.com/kiwixcompo/federal-california-leave-assistant/archive/refs/heads/main.zip',
        'GitHub API Root' => 'https://api.github.com',
        'GitHub Main Site' => 'https://github.com'
    ];
    
    foreach ($urls_to_test as $name => $url) {
        echo "<div class='info test'><strong>Testing: $name</strong><br>URL: $url</div>";
        
        // Test with file_get_contents
        $start_time = microtime(true);
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: HRLeaveAssist-Debug/1.0',
                    'Accept: application/vnd.github.v3+json'
                ],
                'timeout' => 30,
                'ignore_errors' => true
            ]
        ]);
        
        $result = @file_get_contents($url, false, $context);
        $end_time = microtime(true);
        $duration = round(($end_time - $start_time) * 1000, 2);
        
        if ($result !== false) {
            $size = strlen($result);
            $class = $size > 1000 ? 'pass' : 'fail';
            echo "<div class='$class test'>";
            echo "✅ Success: Downloaded " . number_format($size) . " bytes in {$duration}ms<br>";
            
            // Show first few bytes to verify content
            $preview = substr($result, 0, 100);
            $is_zip = substr($result, 0, 2) === 'PK'; // ZIP file signature
            $is_html = strpos($preview, '<html') !== false || strpos($preview, '<!DOCTYPE') !== false;
            
            echo "Content type: " . ($is_zip ? 'ZIP file' : ($is_html ? 'HTML page' : 'Other')) . "<br>";
            echo "First 100 bytes: <code>" . htmlspecialchars($preview) . "</code>";
            echo "</div>";
        } else {
            echo "<div class='fail test'>";
            echo "❌ Failed to download after {$duration}ms<br>";
            
            // Get error details
            $error = error_get_last();
            if ($error) {
                echo "Error: " . htmlspecialchars($error['message']) . "<br>";
            }
            
            // Check HTTP response headers
            if (isset($http_response_header)) {
                echo "HTTP Response Headers:<br>";
                echo "<div class='code'>" . htmlspecialchars(implode("\n", $http_response_header)) . "</div>";
            } else {
                echo "No HTTP response headers available<br>";
            }
            echo "</div>";
        }
        
        // Add a small delay between requests
        usleep(500000); // 0.5 seconds
    }
    ?>
    
    <div class="info test">
        <strong>🔧 Server Configuration:</strong><br>
        PHP Version: <?php echo phpversion(); ?><br>
        allow_url_fopen: <?php echo ini_get('allow_url_fopen') ? 'Enabled' : 'Disabled'; ?><br>
        CURL Available: <?php echo function_exists('curl_init') ? 'Yes' : 'No'; ?><br>
        User Agent String: <?php echo $_SERVER['HTTP_USER_AGENT'] ?? 'Not available'; ?><br>
        Server IP: <?php echo $_SERVER['SERVER_ADDR'] ?? 'Not available'; ?><br>
        Remote IP: <?php echo $_SERVER['REMOTE_ADDR'] ?? 'Not available'; ?>
    </div>
    
    <?php if (function_exists('curl_init')): ?>
    <div class="info test">
        <strong>🔄 Testing with CURL (if available):</strong><br>
        <?php
        $curl_url = 'https://api.github.com/repos/kiwixcompo/federal-california-leave-assistant/zipball/main';
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $curl_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, 'HRLeaveAssist-Debug/1.0');
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/vnd.github.v3+json']);
        
        $curl_result = curl_exec($ch);
        $curl_info = curl_getinfo($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_result !== false && empty($curl_error)) {
            echo "✅ CURL Success: " . number_format(strlen($curl_result)) . " bytes<br>";
            echo "HTTP Code: " . $curl_info['http_code'] . "<br>";
            echo "Total Time: " . round($curl_info['total_time'] * 1000, 2) . "ms<br>";
        } else {
            echo "❌ CURL Failed<br>";
            echo "Error: " . htmlspecialchars($curl_error) . "<br>";
            echo "HTTP Code: " . $curl_info['http_code'] . "<br>";
        }
        ?>
    </div>
    <?php endif; ?>
    
    <div class="info test">
        <strong>💡 Next Steps:</strong><br>
        1. If all tests fail, your server cannot access GitHub (firewall/network issue)<br>
        2. If you get HTML instead of ZIP files, GitHub might be blocking your server<br>
        3. If downloads are very small (&lt;1000 bytes), you might be getting error pages<br>
        4. Contact your hosting provider if external URL access is blocked<br>
        5. Try the deployment script - it has multiple fallback methods
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
        <a href="test-deploy.php" style="display: inline-block; margin: 10px; padding: 10px 20px; background: #0023F5; color: white; text-decoration: none; border-radius: 5px;">🧪 Run Full Test</a>
        <a href="deploy.php?manual=true" style="display: inline-block; margin: 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">🚀 Try Deployment</a>
    </div>
</body>
</html>