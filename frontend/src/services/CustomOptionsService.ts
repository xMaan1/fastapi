import { ApiService } from "./ApiService";

export interface CustomOption {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export class CustomOptionsService {
  private apiService: ApiService;

  constructor(apiService: ApiService) {
    this.apiService = apiService;
  }

  // Custom Event Types
  async createCustomEventType(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post("/custom-options/event-types", {
      name,
      description,
    });
    return response.data;
  }

  async getCustomEventTypes(): Promise<CustomOption[]> {
    const response = await this.apiService.get("/custom-options/event-types");
    return response.data;
  }

  // Custom Departments
  async createCustomDepartment(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post("/custom-options/departments", {
      name,
      description,
    });
    return response.data;
  }

  async getCustomDepartments(): Promise<CustomOption[]> {
    const response = await this.apiService.get("/custom-options/departments");
    return response.data;
  }

  // Custom Leave Types
  async createCustomLeaveType(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post("/custom-options/leave-types", {
      name,
      description,
    });
    return response.data;
  }

  async getCustomLeaveTypes(): Promise<CustomOption[]> {
    const response = await this.apiService.get("/custom-options/leave-types");
    return response.data;
  }

  // Custom Lead Sources
  async createCustomLeadSource(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post(
      "/custom-options/lead-sources",
      {
        name,
        description,
      },
    );
    return response.data;
  }

  async getCustomLeadSources(): Promise<CustomOption[]> {
    const response = await this.apiService.get("/custom-options/lead-sources");
    return response.data;
  }

  // Custom Contact Sources
  async createCustomContactSource(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post(
      "/custom-options/contact-sources",
      {
        name,
        description,
      },
    );
    return response.data;
  }

  async getCustomContactSources(): Promise<CustomOption[]> {
    const response = await this.apiService.get(
      "/custom-options/contact-sources",
    );
    return response.data;
  }

  // Custom Company Industries
  async createCustomCompanyIndustry(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post(
      "/custom-options/company-industries",
      {
        name,
        description,
      },
    );
    return response.data;
  }

  async getCustomCompanyIndustries(): Promise<CustomOption[]> {
    const response = await this.apiService.get(
      "/custom-options/company-industries",
    );
    return response.data;
  }

  // Custom Contact Types
  async createCustomContactType(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post(
      "/custom-options/contact-types",
      {
        name,
        description,
      },
    );
    return response.data;
  }

  async getCustomContactTypes(): Promise<CustomOption[]> {
    const response = await this.apiService.get("/custom-options/contact-types");
    return response.data;
  }

  // Custom Industries
  async createCustomIndustry(
    name: string,
    description?: string,
  ): Promise<CustomOption> {
    const response = await this.apiService.post("/custom-options/industries", {
      name,
      description,
    });
    return response.data;
  }

  async getCustomIndustries(): Promise<CustomOption[]> {
    const response = await this.apiService.get("/custom-options/industries");
    return response.data;
  }
}
