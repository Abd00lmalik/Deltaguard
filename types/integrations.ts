export type IntegrationStatus = 'mock' | 'placeholder' | 'ready' | 'disabled';

export interface IntegrationDescriptor {
  name: string;
  status: IntegrationStatus;
  currentBehavior: string;
  futureBehavior: string;
  envVars: string[];
  filePath: string;
  readmePath: string;
}
