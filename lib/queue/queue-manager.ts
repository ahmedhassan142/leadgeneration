// lib/queue/queue-manager.ts - UPDATED for Micro-batch Processor
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class QueueManager {
  private processorProcess: any = null;
  private startAttempts = 0;
  private maxAttempts = 3;

  // Start the micro-batch processor
  startProcessor() {
    if (this.processorProcess) {
      console.log('📦 Micro-batch processor already running');
      return this.processorProcess;
    }

    this.startAttempts++;
    console.log(`🚀 Starting micro-batch processor (attempt ${this.startAttempts}/${this.maxAttempts})...`);
    
    // 👉 Using micro-batch-processor.ts
    const processorPath = path.join(process.cwd(), 'lib', 'queue', 'micro-batch-processor.ts');
    
    // Check if file exists
    if (!fs.existsSync(processorPath)) {
      console.error(`❌ Processor file not found at: ${processorPath}`);
      return null;
    }

    // Spawn the processor with proper environment
    this.processorProcess = spawn('npx', ['tsx', processorPath], {
      detached: true,
      stdio: 'pipe',
      env: { 
        ...process.env, 
        FORCE_COLOR: 'true',
        NODE_OPTIONS: '--max-old-space-size=4096 --expose-gc'
      }
    });

    // Handle output
    this.processorProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(output);
    });

    this.processorProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      process.stderr.write(`[QUEUE ERROR] ${error}`);
    });

    this.processorProcess.on('close', (code: number) => {
      console.log(`\n📦 Micro-batch processor exited with code ${code}`);
      this.processorProcess = null;
      
      // Restart if it crashed and we haven't exceeded max attempts
      if (code !== 0 && this.startAttempts < this.maxAttempts) {
        console.log(`🔄 Restarting micro-batch processor in 5 seconds...`);
        setTimeout(() => this.startProcessor(), 5000);
      } else if (code !== 0) {
        console.error(`❌ Micro-batch processor failed after ${this.maxAttempts} attempts`);
      }
    });

    // Handle process errors
    this.processorProcess.on('error', (err: Error) => {
      console.error(`❌ Failed to start micro-batch processor:`, err);
      this.processorProcess = null;
    });

    return this.processorProcess;
  }

  // Stop the processor
  stopProcessor() {
    if (this.processorProcess) {
      console.log('🛑 Stopping micro-batch processor...');
      
      // Kill the process group
      try {
        process.kill(-this.processorProcess.pid);
      } catch (e) {
        this.processorProcess.kill();
      }
      
      this.processorProcess = null;
      this.startAttempts = 0;
      console.log('✅ Micro-batch processor stopped');
    }
  }

  // Check if processor is running
  isRunning() {
    return this.processorProcess !== null;
  }

  // Get processor status
  getStatus() {
    return {
      running: this.isRunning(),
      pid: this.processorProcess?.pid || null,
      startAttempts: this.startAttempts,
      type: 'micro-batch',
      workers: 3,
      waveSize: 20
    };
  }
}

// Export singleton instance
export const queueManager = new QueueManager();