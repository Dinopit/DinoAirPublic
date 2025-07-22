import { NextResponse } from 'next/server';

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  timestamp: string;
}

interface HealthResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    ollama: ServiceStatus;
    comfyui: ServiceStatus;
  };
  timestamp: string;
}

async function checkOllamaHealth(): Promise<ServiceStatus> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'Ollama is running and accessible',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'unhealthy',
      message: `Ollama returned status ${response.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Failed to connect to Ollama',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkComfyUIHealth(): Promise<ServiceStatus> {
  try {
    const response = await fetch('http://localhost:8188/system_stats', {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'ComfyUI is running and accessible',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'unhealthy',
      message: `ComfyUI returned status ${response.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Failed to connect to ComfyUI',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function GET() {
  try {
    // Check both services in parallel
    const [ollamaStatus, comfyuiStatus] = await Promise.all([
      checkOllamaHealth(),
      checkComfyUIHealth(),
    ]);

    // Determine overall health
    let overall: HealthResponse['overall'] = 'healthy';
    if (ollamaStatus.status === 'unhealthy' && comfyuiStatus.status === 'unhealthy') {
      overall = 'unhealthy';
    } else if (ollamaStatus.status === 'unhealthy' || comfyuiStatus.status === 'unhealthy') {
      overall = 'degraded';
    }

    const response: HealthResponse = {
      overall,
      services: {
        ollama: ollamaStatus,
        comfyui: comfyuiStatus,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: overall === 'healthy' ? 200 : overall === 'degraded' ? 206 : 503,
    });
  } catch (error) {
    return NextResponse.json(
      {
        overall: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}