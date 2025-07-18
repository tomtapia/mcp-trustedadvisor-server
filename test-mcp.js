#!/usr/bin/env node

/**
 * Test script for MCP Trusted Advisor Server
 * 
 * This script demonstrates how to test the MCP server locally
 * by simulating MCP protocol messages.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'main.js');

console.log('🚀 Testing MCP Trusted Advisor Server...');
console.log(`📂 Server path: ${serverPath}`);

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    AWS_REGION: 'us-east-1'
  }
});

// Send initialization message
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      roots: {
        listChanged: false
      }
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

console.log('📤 Sending initialization message...');
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Handle server responses
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('📥 Server response:', JSON.stringify(response, null, 2));
      
      // If we get the initialization response, send a resources/list request
      if (response.id === 1) {
        const resourcesMessage = {
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/list'
        };
        
        console.log('📤 Requesting resources list...');
        server.stdin.write(JSON.stringify(resourcesMessage) + '\n');
      }
      
      // If we get the resources list, try to read a resource
      if (response.id === 2 && response.result?.resources) {
        const firstResource = response.result.resources[0];
        if (firstResource) {
          const readMessage = {
            jsonrpc: '2.0',
            id: 3,
            method: 'resources/read',
            params: {
              uri: firstResource.uri
            }
          };
          
          console.log('📤 Reading first resource...');
          server.stdin.write(JSON.stringify(readMessage) + '\n');
        }
      }
      
      // After reading a resource, close the test
      if (response.id === 3) {
        console.log('✅ Test completed successfully!');
        server.kill();
      }
      
    } catch (error) {
      console.log('📄 Server output (non-JSON):', line);
    }
  });
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', (code) => {
  console.log(`🏁 Server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test...');
  server.kill();
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - stopping server...');
  server.kill();
}, 30000);
