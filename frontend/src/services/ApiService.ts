import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SessionManager } from './SessionManager';

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiService {
  private client: AxiosInstance;
  private sessionManager: SessionManager;
  private publicEndpoints = ['/auth/login', '/auth/register'];
  private currentTenantId: string | null = null;
  
  constructor() {
    this.sessionManager = new SessionManager();

    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    this.setupInterceptors();
  }

  // Tenant management
  setTenantId(tenantId: string | null) {
    this.currentTenantId = tenantId;
    if (typeof window !== 'undefined') {
      if (tenantId) {
        localStorage.setItem('currentTenantId', tenantId);
      } else {
        localStorage.removeItem('currentTenantId');
      }
    }
  }

  getTenantId(): string | null {
    if (this.currentTenantId) {
      return this.currentTenantId;
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentTenantId');
    }
    return null;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Only check auth on client side
        if (typeof window !== 'undefined') {
          // Check if this is a public endpoint
          const isPublicEndpoint = this.publicEndpoints.some(endpoint =>
            config.url?.includes(endpoint)
          );

          if (!isPublicEndpoint) {
            // Check if user is authenticated for protected endpoints
            if (!this.sessionManager.isSessionValid()) {
              window.location.href = '/login';
              return Promise.reject(new Error('Not authenticated'));
            }
          }
        }
        
        const token = this.sessionManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add tenant header if available
        const tenantId = this.getTenantId();
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.sessionManager.clearSession();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }) {
    try {
      const response = await this.post('/auth/login', credentials);
      console.log('Login response:', response);
      
      // Store session after successful login
      if (response.success && response.token && response.user) {
        this.sessionManager.setSession(response.token, response.user);
        console.log('Session stored successfully');
      }

      return response;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  }

  async register(userData: {
    userName: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    return this.post('/auth/register', userData);
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async logout() {
    return this.post('/auth/logout');
  }

  // User endpoints
  async getUsers() {
    return this.get('/users');
  }

  async getTenantUsers(tenantId: string) {
    return this.get(`/tenants/${tenantId}/users`);
  }

  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }
  
  async deleteUser(id: string) {
    return this.delete(`/users/${id}`);
  }
  // SaaS Plans and Subscription
  async getPlans() {
    return this.get('/plans');
  }

  async subscribeToPlan(data: { planId: string; tenantName: string; domain?: string }) {
    return this.post('/tenants/subscribe', data);
  }
  
  // Tenant endpoints
  async getMyTenants() {
    return this.get('/tenants/my-tenants');
  }

  async getTenant(tenantId: string) {
    return this.get(`/tenants/${tenantId}`);
  }

  async getTenantUsers(tenantId: string) {
    return this.get(`/tenants/${tenantId}/users`);
  }

  // Project endpoints
  async getProjects() {
    return this.get('/projects');
  }

  async getProject(id: string) {
    return this.get(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.post('/projects', data);
  }

  async updateProject(id: string, data: any) {
    return this.put(`/projects/${id}`, data);
  }

  async deleteProject(id: string) {
    return this.delete(`/projects/${id}`);
  }

  async getProjectTeamMembers() {
    return this.get('/projects/team-members');
  }

  // Task endpoints
  async getTasks(params?: {
    project?: string;
    status?: string;
    assignedTo?: string;
    includeSubtasks?: boolean;
    mainTasksOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.project) queryParams.append('project', params.project);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
    if (params?.includeSubtasks !== undefined) queryParams.append('include_subtasks', params.includeSubtasks.toString());
    if (params?.mainTasksOnly !== undefined) queryParams.append('main_tasks_only', params.mainTasksOnly.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async getTask(id: string, includeSubtasks: boolean = true) {
    const params = includeSubtasks ? '?include_subtasks=true' : '?include_subtasks=false';
    return this.get(`/tasks/${id}${params}`);
  }

  async createTask(data: any) {
    return this.post('/tasks', data);
  }

  async updateTask(id: string, data: any) {
    return this.put(`/tasks/${id}`, data);
  }

  async deleteTask(id: string) {
    return this.delete(`/tasks/${id}`);
  }

  async getTasksByProject(projectId: string, mainTasksOnly: boolean = false) {
    const params = mainTasksOnly ? '?main_tasks_only=true' : '';
    return this.get(`/tasks?project=${projectId}${params}`);
  }

  // Subtask endpoints
  async getSubtasks(taskId: string) {
    return this.get(`/tasks/${taskId}/subtasks`);
  }

  async createSubtask(taskId: string, data: any) {
    return this.post(`/tasks/${taskId}/subtasks`, data);
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
  
  // Custom Roles & Permissions
  async getCustomRoles(tenantId: string) {
    return this.get(`/tenants/${tenantId}/custom-roles`);
  }
  
  async createCustomRole(tenantId: string, data: { name: string; permissions: string[] }) {
    return this.post(`/tenants/${tenantId}/custom-roles`, data);
  }
  
  async updateCustomRole(tenantId: string, roleId: string, data: { name?: string; permissions?: string[] }) {
    return this.put(`/tenants/${tenantId}/custom-roles/${roleId}`, data);
  }
  
  async deleteCustomRole(tenantId: string, roleId: string) {
    return this.delete(`/tenants/${tenantId}/custom-roles/${roleId}`);
  }
  
  async getPermissions() {
    return this.get('/tenants/permissions');
  }
  // Test connection
  async testConnection() {
    return this.get('/');
  }
}

export const apiService = new ApiService();
export default apiService;