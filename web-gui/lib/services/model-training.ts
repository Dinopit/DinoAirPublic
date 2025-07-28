/**
 * Model Training Service
 * Mock implementation for demonstration
 */

export interface IDataset {
  id: string;
  name: string;
  description: string;
  type: string;
  format: string;
  uploadedBy: string;
  createdAt: string;
  size: number;
  recordCount: number;
}

export interface ITrainingJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

class ModelTrainingService {
  private datasets: IDataset[] = [
    {
      id: 'dataset-1',
      name: 'Sample Chat Dataset',
      description: 'A sample dataset for chat model training',
      type: 'conversational',
      format: 'jsonl',
      uploadedBy: 'admin',
      createdAt: new Date().toISOString(),
      size: 1024000,
      recordCount: 1500,
    },
  ];

  private trainingJobs: ITrainingJob[] = [
    {
      id: 'job-1',
      name: 'Sample Training Job',
      status: 'completed',
      config: { epochs: 10, learningRate: 0.001 },
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 100,
    },
  ];

  async getDatasets(): Promise<IDataset[]> {
    return this.datasets;
  }

  async uploadDataset(file: File, metadata: any): Promise<IDataset> {
    const dataset: IDataset = {
      id: `dataset-${Date.now()}`,
      name: metadata.name,
      description: metadata.description,
      type: metadata.type,
      format: metadata.format,
      uploadedBy: metadata.uploadedBy,
      createdAt: new Date().toISOString(),
      size: file.size,
      recordCount: Math.floor(Math.random() * 1000) + 100,
    };

    this.datasets.push(dataset);
    return dataset;
  }

  async getTrainingJobs(filters?: any): Promise<ITrainingJob[]> {
    return this.trainingJobs;
  }

  async createTrainingJob(name: string, config: any, createdBy: string): Promise<ITrainingJob> {
    const job: ITrainingJob = {
      id: `job-${Date.now()}`,
      name,
      status: 'pending',
      config,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
    };

    this.trainingJobs.push(job);
    return job;
  }
}

export const modelTrainingService = new ModelTrainingService();
