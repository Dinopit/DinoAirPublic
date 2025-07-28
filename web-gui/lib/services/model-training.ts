// Placeholder model training service
export const modelTrainingService = {
  getDatasets: async () => {
    throw new Error('Model training service not implemented');
  },
  uploadDataset: async (file: any, metadata: any) => {
    throw new Error('Model training service not implemented');
  },
  getTrainingJobs: async (filters: any) => {
    throw new Error('Model training service not implemented');
  },
  createTrainingJob: async (name: string, config: any, createdBy: string) => {
    throw new Error('Model training service not implemented');
  },
};
