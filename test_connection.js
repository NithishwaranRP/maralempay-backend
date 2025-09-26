// Test script to verify backend server connectivity
const http = require('http');

function testConnection(host, port, path = '/') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          data: data,
          host: host,
          port: port,
          path: path
        });
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        host: host,
        port: port,
        path: path
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        success: false,
        error: 'Connection timeout',
        host: host,
        port: port,
        path: path
      });
    });

    req.end();
  });
}

async function runConnectionTests() {
  console.log('🧪 Testing backend server connectivity...\n');

  const tests = [
    { host: 'localhost', port: 3000, path: '/' },
    { host: 'localhost', port: 3000, path: '/api/health' },
    { host: '127.0.0.1', port: 3000, path: '/' },
    { host: '10.216.61.90', port: 3000, path: '/' },
    { host: '10.216.61.90', port: 3000, path: '/api/health' }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.host}:${test.port}${test.path}...`);
      const result = await testConnection(test.host, test.port, test.path);
      
      if (result.success) {
        console.log(`✅ SUCCESS - Status: ${result.status}`);
        if (result.data) {
          try {
            const parsed = JSON.parse(result.data);
            console.log(`   Response: ${parsed.message || 'OK'}`);
          } catch (e) {
            console.log(`   Response: ${result.data.substring(0, 100)}...`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ FAILED - ${error.error}`);
    }
    console.log('');
  }

  console.log('🎯 Connection test completed!');
  console.log('\n💡 If all tests fail:');
  console.log('   1. Make sure your backend server is running: node server.js');
  console.log('   2. Check if port 3000 is accessible');
  console.log('   3. Verify firewall settings');
  console.log('   4. Check if the IP address 10.216.61.90 is correct');
}

runConnectionTests().catch(console.error);
