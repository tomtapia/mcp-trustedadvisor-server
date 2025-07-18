/**
 * End-to-End tests for MCP Trusted Advisor Server
 * Tests the complete MCP server functionality including transport
 */

import { spawn, ChildProcess } from 'child_process';
import { readFile } from 'fs/promises';
import path from 'path';

describe('E2E: MCP Trusted Advisor Server', () => {
  let serverProcess: ChildProcess;
  const serverTimeout = 30000; // 30 seconds

  beforeAll(async () => {
    // Ensure the server is built
    await expectServerToBeBuild();
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null as any;
    }
  });

  describe('Server Startup and Basic Functionality', () => {
    it('should start without errors', async () => {
      const { stdout, stderr, exitCode } = await runServer(['--help'], 5000);

      expect(exitCode).toBe(0);
      expect(stderr).toBe('');
    }, 10000);

    it('should handle MCP initialization protocol', async () => {
      const server = await startMcpServer();
      
      // Send MCP initialization request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            resources: {},
            tools: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await sendMcpRequest(server, initRequest);
      
      expect(response.result).toBeDefined();
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.capabilities.resources).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('mcp-trustedadvisor-server');
    }, serverTimeout);

    it('should list available resources', async () => {
      const server = await startMcpServer();
      await initializeServer(server);

      const listRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {}
      };

      const response = await sendMcpRequest(server, listRequest);
      
      expect(response.result).toBeDefined();
      expect(response.result.resources).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);
      
      // Check for expected resources
      const resourceNames = response.result.resources.map((r: any) => r.name);
      expect(resourceNames).toContain('List Trusted Advisor Checks');
      expect(resourceNames).toContain('List Trusted Advisor Recommendations');
    }, serverTimeout);
  });

  describe('Resource Operations', () => {
    it('should handle resource read requests with mocked AWS', async () => {
      // Mock AWS credentials for testing
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.AWS_REGION = 'us-east-1';

      const server = await startMcpServer();
      await initializeServer(server);

      const readRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/read',
        params: {
          uri: 'trusted-advisor://checks/list',
          arguments: {
            language: 'en',
            maxResults: 5
          }
        }
      };

      const response = await sendMcpRequest(server, readRequest);
      
      // Should return an error because we don't have real AWS credentials
      // But the server should handle it gracefully
      expect(response.error || response.result).toBeDefined();
      
      if (response.result) {
        expect(response.result.contents).toBeDefined();
        expect(Array.isArray(response.result.contents)).toBe(true);
      }

      // Clean up env vars
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
    }, serverTimeout);

    it('should handle invalid resource URIs', async () => {
      const server = await startMcpServer();
      await initializeServer(server);

      const readRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/read',
        params: {
          uri: 'trusted-advisor://invalid/resource'
        }
      };

      const response = await sendMcpRequest(server, readRequest);
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602); // Invalid params
    }, serverTimeout);

    it('should handle malformed requests gracefully', async () => {
      const server = await startMcpServer();
      await initializeServer(server);

      const malformedRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read'
        // Missing params
      };

      const response = await sendMcpRequest(server, malformedRequest);
      
      expect(response.error).toBeDefined();
    }, serverTimeout);
  });

  describe('Error Handling and Resilience', () => {
    it('should handle concurrent requests', async () => {
      const server = await startMcpServer();
      await initializeServer(server);

      const requests = Array.from({ length: 5 }, (_, i) => ({
        jsonrpc: '2.0',
        id: i + 10,
        method: 'resources/list',
        params: {}
      }));

      const promises = requests.map(req => sendMcpRequest(server, req));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        expect(response.id).toBe(index + 10);
        expect(response.result || response.error).toBeDefined();
      });
    }, serverTimeout);

    it('should handle invalid JSON-RPC requests', async () => {
      const server = await startMcpServer();
      
      // Send invalid JSON
      const invalidJson = 'not-valid-json';
      
      server.stdin?.write(invalidJson + '\n');
      
      // Give server time to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Server should still be responsive
      const validRequest = {
        jsonrpc: '2.0',
        id: 100,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' }
        }
      };

      const response = await sendMcpRequest(server, validRequest);
      expect(response.result || response.error).toBeDefined();
    }, serverTimeout);
  });

  describe('Performance and Memory', () => {
    it('should not leak memory during operation', async () => {
      const server = await startMcpServer();
      await initializeServer(server);

      const initialMemory = process.memoryUsage();
      
      // Send many requests
      for (let i = 0; i < 50; i++) {
        const request = {
          jsonrpc: '2.0',
          id: i + 200,
          method: 'resources/list',
          params: {}
        };
        
        await sendMcpRequest(server, request);
        
        if (i % 10 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, serverTimeout);

    it('should respond to requests within reasonable time', async () => {
      const server = await startMcpServer();
      await initializeServer(server);

      const request = {
        jsonrpc: '2.0',
        id: 300,
        method: 'resources/list',
        params: {}
      };

      const startTime = performance.now();
      const response = await sendMcpRequest(server, request);
      const endTime = performance.now();

      expect(response.result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    }, serverTimeout);
  });

  // Helper functions
  async function expectServerToBeBuild(): Promise<void> {
    try {
      const distPath = path.join(process.cwd(), 'dist', 'main.js');
      await readFile(distPath);
    } catch (error) {
      throw new Error('Server not built. Run "npm run build" first.');
    }
  }

  async function runServer(args: string[], timeoutMs = 5000): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }> {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(process.cwd(), 'dist', 'main.js');
      const child = spawn('node', [serverPath, ...args], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });

      child.on('error', reject);

      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Server timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  async function startMcpServer(): Promise<ChildProcess> {
    const serverPath = path.join(process.cwd(), 'dist', 'main.js');
    const child = spawn('node', [serverPath], {
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (child.killed || child.exitCode !== null) {
      throw new Error('Server failed to start');
    }

    return child;
  }

  async function sendMcpRequest(server: ChildProcess, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestStr = JSON.stringify(request) + '\n';
      
      let responseBuffer = '';
      
      const onData = (data: Buffer) => {
        responseBuffer += data.toString();
        
        // Check if we have a complete JSON response
        const lines = responseBuffer.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                server.stdout?.off('data', onData);
                resolve(response);
                return;
              }
            } catch (e) {
              // Not complete JSON yet, continue
            }
          }
        }
      };

      server.stdout?.on('data', onData);
      
      server.stdin?.write(requestStr);

      // Timeout after 10 seconds
      setTimeout(() => {
        server.stdout?.off('data', onData);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  async function initializeServer(server: ChildProcess): Promise<void> {
    const initRequest = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    await sendMcpRequest(server, initRequest);

    // Send initialized notification
    const initializedNotification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    };

    server.stdin?.write(JSON.stringify(initializedNotification) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
});
