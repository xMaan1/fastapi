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

export class ApiService {
  private client: AxiosInstance;
  private sessionManager: SessionManager;
  private publicEndpoints = ['/auth/login', '/auth/register'];
  private currentTenantId: string | null = null;

  constructor() {
    this.sessionManager = new SessionManager();

    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Initialize tenant ID from localStorage if available
    if (typeof window !== 'undefined') {
      this.currentTenantId = localStorage.getItem('currentTenantId');
    }

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
        localStorage.removeItem('userTenants');
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

  // Store user tenants in localStorage
  setUserTenants(tenants: any[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userTenants', JSON.stringify(tenants));
    }
  }

  // Get user tenants from localStorage
  getUserTenants(): any[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userTenants');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (error) {
          console.error('Error parsing stored tenants:', error);
          localStorage.removeItem('userTenants');
        }
      }
    }
    return [];
  }

  // Get current tenant info from localStorage
  getCurrentTenant(): any | null {
    const tenantId = this.getTenantId();
    if (!tenantId) return null;

    const tenants = this.getUserTenants();
    return tenants.find(t => t.id === tenantId) || null;
  }

  // Force refresh tenants from API (for admin operations)
  async refreshTenants(): Promise<any[]> {
    try {
      const tenantsResponse = await this.getMyTenants();
      if (tenantsResponse.tenants) {
        this.setUserTenants(tenantsResponse.tenants);
        return tenantsResponse.tenants;
      }
      return [];
    } catch (error) {
      console.error('Failed to refresh tenants:', error);
      throw error;
    }
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

      // Store session after successful login
      if (response.success && response.token && response.user) {
        this.sessionManager.setSession(response.token, response.user);

        // Fetch user's tenants ONCE during login and store in localStorage
        try {
          const tenantsResponse = await this.getMyTenants();
          if (tenantsResponse.tenants && tenantsResponse.tenants.length > 0) {
            // Store all tenants in localStorage
            this.setUserTenants(tenantsResponse.tenants);

            // Set the first tenant as current tenant
            this.setTenantId(tenantsResponse.tenants[0].id);
          }
        } catch (tenantError) {
          console.warn('Could not fetch tenants:', tenantError);
          // Continue without tenant - some endpoints might still work
        }
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
    try {
      const response = await this.post('/auth/logout');
      // Clear all tenant information on logout
      this.setTenantId(null);
      return response;
    } catch (error) {
      // Clear tenant even if logout request fails
      this.setTenantId(null);
      throw error;
    }
  }

  // User endpoints
  async getUsers() {
    // Use tenant-scoped endpoint if tenant is available, otherwise fallback to global
    const tenantId = this.getTenantId();
    if (tenantId) {
      return this.getTenantUsers(tenantId);
    }
    return this.get('/users');
  }

  async getTenantUsers(tenantId: string) {
    return this.get(`/tenants/${tenantId}/users`);
  }

  // Get users for current tenant
  async getCurrentTenantUsers() {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant selected');
    }
    return this.getTenantUsers(tenantId);
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

  async switchTenant(tenantId: string) {
    // Verify user has access to this tenant using stored tenants (no API call)
    const storedTenants = this.getUserTenants();
    const tenant = storedTenants.find((t: any) => t.id === tenantId);

    if (!tenant) {
      throw new Error('Access denied to this tenant');
    }

    this.setTenantId(tenantId);
    return tenant;
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
    try {
      const response = await this.get('/health');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Event methods
  async getEvents(params?: {
    project?: string;
    user?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.project) queryParams.append('project_id', params.project);
      if (params?.user) queryParams.append('user_id', params.user);
      if (params?.status) queryParams.append('status_filter', params.status);
      if (params?.page) queryParams.append('skip', ((params.page - 1) * (params.limit || 100)).toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/events?${queryParams.toString()}`;
      const response = await this.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getEvent(id: string) {
    try {
      const response = await this.get(`/events/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createEvent(data: any) {
    try {
      const response = await this.post('/events', data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateEvent(id: string, data: any) {
    try {
      const response = await this.put(`/events/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteEvent(id: string) {
    try {
      const response = await this.delete(`/events/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUpcomingEvents(days: number = 7) {
    try {
      const response = await this.get(`/events/upcoming?days=${days}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async joinEvent(id: string) {
    try {
      const response = await this.post(`/events/${id}/join`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async leaveEvent(id: string) {
    try {
      const response = await this.post(`/events/${id}/leave`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async regenerateMeetLink(id: string) {
    try {
      const response = await this.post(`/events/${id}/regenerate-meet-link`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Sales Module Methods
  // Lead endpoints
  async getLeads(params?: {
    status?: string;
    source?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.source) queryParams.append('source', params.source);
    if (params?.assignedTo) queryParams.append('assigned_to', params.assignedTo);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async getLead(id: string) {
    return this.get(`/sales/leads/${id}`);
  }

  async createLead(data: any) {
    return this.post('/sales/leads', data);
  }

  async updateLead(id: string, data: any) {
    return this.put(`/sales/leads/${id}`, data);
  }

  async deleteLead(id: string) {
    return this.delete(`/sales/leads/${id}`);
  }

  // Contact endpoints
  async getContacts(params?: {
    companyId?: string;
    contactType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.companyId) queryParams.append('company_id', params.companyId);
    if (params?.contactType) queryParams.append('contact_type', params.contactType);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async createContact(data: any) {
    return this.post('/sales/contacts', data);
  }

  async updateContact(id: string, data: any) {
    return this.put(`/sales/contacts/${id}`, data);
  }

  async deleteContact(id: string) {
    return this.delete(`/sales/contacts/${id}`);
  }

  // Company endpoints
  async getCompanies(params?: {
    industry?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.industry) queryParams.append('industry', params.industry);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/companies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async createCompany(data: any) {
    return this.post('/sales/companies', data);
  }

  async updateCompany(id: string, data: any) {
    return this.put(`/sales/companies/${id}`, data);
  }

  async deleteCompany(id: string) {
    return this.delete(`/sales/companies/${id}`);
  }

  // Opportunity endpoints
  async getOpportunities(params?: {
    stage?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.stage) queryParams.append('stage', params.stage);
    if (params?.assignedTo) queryParams.append('assigned_to', params.assignedTo);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/opportunities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async createOpportunity(data: any) {
    return this.post('/sales/opportunities', data);
  }

  async updateOpportunity(id: string, data: any) {
    return this.put(`/sales/opportunities/${id}`, data);
  }

  async deleteOpportunity(id: string) {
    return this.delete(`/sales/opportunities/${id}`);
  }

  // Quote endpoints
  async getQuotes(params?: {
    status?: string;
    opportunityId?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.opportunityId) queryParams.append('opportunity_id', params.opportunityId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/quotes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async createQuote(data: any) {
    return this.post('/sales/quotes', data);
  }

  async updateQuote(id: string, data: any) {
    return this.put(`/sales/quotes/${id}`, data);
  }

  async deleteQuote(id: string) {
    return this.delete(`/sales/quotes/${id}`);
  }

  // Contract endpoints
  async getContracts(params?: {
    status?: string;
    opportunityId?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.opportunityId) queryParams.append('opportunity_id', params.opportunityId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/contracts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async createContract(data: any) {
    return this.post('/sales/contracts', data);
  }

  async updateContract(id: string, data: any) {
    return this.put(`/sales/contracts/${id}`, data);
  }

  async deleteContract(id: string) {
    return this.delete(`/sales/contracts/${id}`);
  }

  // Sales Activity endpoints
  async getSalesActivities(params?: {
    leadId?: string;
    opportunityId?: string;
    contactId?: string;
    companyId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.leadId) queryParams.append('lead_id', params.leadId);
    if (params?.opportunityId) queryParams.append('opportunity_id', params.opportunityId);
    if (params?.contactId) queryParams.append('contact_id', params.contactId);
    if (params?.companyId) queryParams.append('company_id', params.companyId);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/sales/activities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async createSalesActivity(data: any) {
    return this.post('/sales/activities', data);
  }

  // Sales Dashboard
  async getSalesDashboard() {
    return this.get('/sales/dashboard');
  }

  // Sales Analytics
  async getRevenueAnalytics(period: string = 'monthly', startDate?: string, endDate?: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('period', period);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const url = `/sales/analytics/revenue?${queryParams.toString()}`;
    return this.get(url);
  }

  async getConversionAnalytics() {
    return this.get('/sales/analytics/conversion');
  }
}

export const apiService = new ApiService();
export default apiService;