<?php
/**
 * Simple test script to verify deployment environment
 * Visit: https://hrleaveassist.com/test-deploy.php
 */

// Basic environment check
?>
<!DOCTYPE html>
<html>
<head>
    <title>HR Leave Assist - Deployment Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .header { background: #0023F5; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .test { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .pass { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .fail { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .links { margin-top: 20px; text-align: center; }
        .links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #0023F5; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Deployment Environment Test</h1>
        <p>Testing server capabilities for auto-deployment</p>
    </div>

    <?php
    $tests = [];
    
    // Test 1: PHP Version
    $php_version = phpversion();
    $tests[] = [
        'name' => 'PHP Version',
        'result' => version_compare($php_version, '7.0', '>='),
        'message' => "PHP $php_version " . (version_compare($php_version, '7.0', '>=') ? '✅ Compatible' : '❌ Too old (need 7.0+)')
    ];
    
    // Test 2: ZipArchive
    $tests[] = [
        'name' => 'ZipArchive Extension',
        'result' => class_exists('ZipArchive'),
        'message' => class_exists('ZipArchive') ? '✅ Available' : '❌ Not available (required for deployment)'
    ];
    
    // Test 3: File permissions
    $can_write = is_writable(__DIR__);
    $tests[] = [
        'name' => 'Directory Write Permissions',
        'result' => $can_write,
        'message' => $can_write ? '✅ Can write to directory' : '❌ Cannot write to directory'
    ];
    
    // Test 4: Internet connectivity (multiple methods)
    $connectivity_tests = [];
    
    // Test 1: GitHub API
    $github_test = @file_get_contents('https://api.github.com', false, stream_context_create([
        'http' => ['timeout' => 10, 'user_agent' => 'HRLeaveAssist-Test/1.0']
    ]));
    $connectivity_tests['GitHub API'] = $github_test !== false;
    
    // Test 2: Direct repository access
    $repo_test = @file_get_contents('https://github.com/kiwixcompo/federal-california-leave-assistant', false, stream_context_create([
        'http' => ['timeout' => 10, 'user_agent' => 'HRLeaveAssist-Test/1.0']
    ]));
    $connectivity_tests['GitHub Repository'] = $repo_test !== false;
    
    // Test 3: Alternative download method
    $alt_test = @file_get_contents('https://github.com/kiwixcompo/federal-california-leave-assistant/archive/refs/heads/main.zip', false, stream_context_create([
        'http' => ['timeout' => 15, 'user_agent' => 'HRLeaveAssist-Test/1.0']
    ]));
    $connectivity_tests['Alternative Download'] = $alt_test !== false && strlen($alt_test) > 1000;
    
    $connectivity_passed = array_sum($connectivity_tests) > 0;
    $connectivity_details = [];
    foreach ($connectivity_tests as $test_name => $result) {
        $connectivity_details[] = "$test_name: " . ($result ? '✅' : '❌');
    }
    
    $tests[] = [
        'name' => 'GitHub Connectivity',
        'result' => $connectivity_passed,
        'message' => $connectivity_passed ? 
            '✅ Can connect to GitHub (' . implode(', ', $connectivity_details) . ')' : 
            '❌ Cannot connect to GitHub (' . implode(', ', $connectivity_details) . ')'
    ];
    
    // Test 5: Memory limit
    $memory_limit = ini_get('memory_limit');
    $memory_bytes = return_bytes($memory_limit);
    $memory_ok = $memory_bytes >= 128 * 1024 * 1024; // 128MB
    $tests[] = [
        'name' => 'Memory Limit',
        'result' => $memory_ok,
        'message' => "Memory limit: $memory_limit " . ($memory_ok ? '✅ Sufficient' : '⚠️ May be low for large deployments')
    ];
    
    // Test 6: Execution time
    $max_execution_time = ini_get('max_execution_time');
    $time_ok = $max_execution_time == 0 || $max_execution_time >= 60;
    $tests[] = [
        'name' => 'Execution Time Limit',
        'result' => $time_ok,
        'message' => "Max execution time: " . ($max_execution_time == 0 ? 'unlimited' : $max_execution_time . 's') . ' ' . ($time_ok ? '✅ Sufficient' : '⚠️ May timeout on large deployments')
    ];
    
    // Test 7: Specific deployment test
    $deployment_test_url = 'https://api.github.com/repos/kiwixcompo/federal-california-leave-assistant/zipball/main';
    $deployment_context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: HRLeaveAssist-Deploy/1.0',
                'Accept: application/vnd.github.v3+json'
            ],
            'timeout' => 20
        ]
    ]);
    
    $deployment_test = @file_get_contents($deployment_test_url, false, $deployment_context);
    $deployment_ok = $deployment_test !== false && strlen($deployment_test) > 1000;
    
    $tests[] = [
        'name' => 'Deployment Download Test',
        'result' => $deployment_ok,
        'message' => $deployment_ok ? 
            '✅ Can download deployment files (' . number_format(strlen($deployment_test)) . ' bytes)' : 
            '❌ Cannot download deployment files from GitHub API'
    ];
    
    // Test 8: URL fopen setting
    $allow_url_fopen = ini_get('allow_url_fopen');
    $tests[] = [
        'name' => 'URL fopen Setting',
        'result' => $allow_url_fopen,
        'message' => $allow_url_fopen ? '✅ allow_url_fopen is enabled' : '❌ allow_url_fopen is disabled (required for downloads)'
    ];
    
    // Test 9: CURL availability
    $curl_available = function_exists('curl_init');
    $tests[] = [
        'name' => 'CURL Extension',
        'result' => $curl_available,
        'message' => $curl_available ? '✅ CURL is available' : '⚠️ CURL not available (fallback methods will be used)'
    ];
    
    function return_bytes($val) {
        $val = trim($val);
        $last = strtolower($val[strlen($val)-1]);
        $val = (int)$val;
        switch($last) {
            case 'g': $val *= 1024;
            case 'm': $val *= 1024;
            case 'k': $val *= 1024;
        }
        return $val;
    }
    
    $all_passed = true;
    foreach ($tests as $test) {
        $class = $test['result'] ? 'pass' : 'fail';
        if (!$test['result']) $all_passed = false;
        echo "<div class='test $class'><strong>{$test['name']}:</strong> {$test['message']}</div>";
    }
    ?>
    
    <div class="test <?php echo $all_passed ? 'pass' : 'info'; ?>">
        <strong>Overall Status:</strong> 
        <?php if ($all_passed): ?>
            ✅ All tests passed! Your server should be able to handle auto-deployment.
        <?php else: ?>
            ⚠️ Some tests failed. Deployment may still work but could encounter issues.
        <?php endif; ?>
    </div>
    
    <div class="info test">
        <strong>💡 Next Steps:</strong><br>
        1. If all tests pass, try the manual deployment<br>
        2. If tests fail, contact your hosting provider about the missing features<br>
        3. The deployment script has been optimized to work around most limitations
    </div>
    
    <div class="links">
        <a href="deploy.php?manual=true">🚀 Try Manual Deployment</a>
        <a href="/">🌐 View Website</a>
    </div>
    
    <div class="test info" style="margin-top: 20px; font-size: 0.9em;">
        <strong>Server Configuration Details:</strong><br>
        Server: <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?><br>
        Document Root: <?php echo $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown'; ?><br>
        Current Directory: <?php echo __DIR__; ?><br>
        PHP Version: <?php echo phpversion(); ?><br>
        allow_url_fopen: <?php echo ini_get('allow_url_fopen') ? 'Enabled' : 'Disabled'; ?><br>
        CURL Available: <?php echo function_exists('curl_init') ? 'Yes' : 'No'; ?><br>
        ZipArchive Available: <?php echo class_exists('ZipArchive') ? 'Yes' : 'No'; ?><br>
        Memory Limit: <?php echo ini_get('memory_limit'); ?><br>
        Max Execution Time: <?php echo ini_get('max_execution_time') == 0 ? 'Unlimited' : ini_get('max_execution_time') . 's'; ?><br>
        Timestamp: <?php echo date('Y-m-d H:i:s T'); ?>
    </div>
    
    <?php if (!$all_passed): ?>
    <div class="test info" style="margin-top: 20px;">
        <strong>🔧 Troubleshooting Steps:</strong><br>
        1. If "allow_url_fopen" is disabled, contact your hosting provider to enable it<br>
        2. If ZipArchive is not available, ask your hosting provider to install the ZIP extension<br>
        3. If connectivity tests fail, check if your server can access external URLs<br>
        4. If deployment download test fails, the repository might be private or inaccessible<br>
        5. Try the manual deployment even if some tests fail - it might still work
    </div>
    <?php endif; ?>
</body>
</html>