'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { useApiService } from '../../../hooks/useApiService';
import { Opportunity, OpportunityStage } from '../../../models/sales';
import { Contact, ContactStatus } from '../../../models/sales';
import { Company, CompanyType } from '../../../models/sales';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Plus
} from 'lucide-react';

export default function SalesAnalyticsPage() {
  const apiService = useApiService();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppsResponse, contactsResponse, companiesResponse] = await Promise.all([
        apiService.getOpportunities(),
        apiService.getContacts(),
        apiService.getCompanies()
      ]);
      
      setOpportunities(oppsResponse.data || []);
      setContacts(contactsResponse.data || []);
      setCompanies(companiesResponse.data || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics based on time range
  const getFilteredData = () => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (parseInt(timeRange) * 24 * 60 * 60 * 1000));
    
    return {
      opportunities: opportunities.filter(opp => 
        !opp.createdAt || new Date(opp.createdAt) >= daysAgo
      ),
      contacts: contacts.filter(contact => 
        !contact.createdAt || new Date(contact.createdAt) >= daysAgo
      ),
      companies: companies.filter(company => 
        !company.createdAt || new Date(company.createdAt) >= daysAgo
      )
    };
  };

  const { opportunities: filteredOpps, contacts: filteredContacts, companies: filteredCompanies } = getFilteredData();

  // Pipeline Analysis
  const pipelineByStage = Object.values(OpportunityStage).map(stage => {
    const stageOpps = filteredOpps.filter(opp => opp.stage === stage);
    const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    const count = stageOpps.length;
    
    return { stage, totalValue, count };
  });

  const totalPipelineValue = filteredOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
  const weightedPipelineValue = filteredOpps.reduce((sum, opp) => 
    sum + ((opp.amount || 0) * (opp.probability || 0) / 100), 0
  );

  // Conversion Metrics
  const totalOpportunities = filteredOpps.length;
  const wonOpportunities = filteredOpps.filter(opp => opp.stage === OpportunityStage.CLOSED_WON).length;
  const lostOpportunities = filteredOpps.filter(opp => opp.stage === OpportunityStage.CLOSED_LOST).length;
  const winRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;
  const lossRate = totalOpportunities > 0 ? (lostOpportunities / totalOpportunities) * 100 : 0;

  // Revenue Metrics
  const totalRevenue = filteredOpps
    .filter(opp => opp.stage === OpportunityStage.CLOSED_WON)
    .reduce((sum, opp) => sum + (opp.amount || 0), 0);

  const avgDealSize = wonOpportunities > 0 ? totalRevenue / wonOpportunities : 0;
  const avgSalesCycle = 30; // Placeholder - would need to calculate from actual data

  // Contact Metrics
  const totalContacts = filteredContacts.length;
  const leadContacts = filteredContacts.filter(c => c.status === ContactStatus.LEAD).length;
  const customerContacts = filteredContacts.filter(c => c.status === ContactStatus.CUSTOMER).length;
  const leadToCustomerRate = leadContacts > 0 ? (customerContacts / leadContacts) * 100 : 0;

  // Company Metrics
  const totalCompanies = filteredCompanies.length;
  const customerCompanies = filteredCompanies.filter(c => c.type === CompanyType.CUSTOMER).length;
  const prospectCompanies = filteredCompanies.filter(c => c.type === CompanyType.PROSPECT).length;

  // Top Performers
  const topOpportunities = filteredOpps
    .filter(opp => opp.amount && opp.amount > 0)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-gray-600">Comprehensive sales performance insights</p>
        </div>
        
        <div className="flex gap-4">
          <div>
            <Label htmlFor="timeRange">Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="stage">Stage Filter</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {Object.values(OpportunityStage).map((stage) => (
                  <SelectItem key={stage as string} value={stage as string}>
                    {(stage as string).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPipelineValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredOpps.length} opportunities
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weightedPipelineValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Probability-adjusted
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {wonOpportunities} won / {totalOpportunities} total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Closed won deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineByStage.map(({ stage, totalValue, count }) => (
                <div key={stage as string} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {(stage as string).replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-gray-600">({count})</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${totalValue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      {totalPipelineValue > 0 ? ((totalValue / totalPipelineValue) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Conversion Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Win Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${winRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">{winRate.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Loss Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${lossRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">{lossRate.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lead to Customer</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${leadToCustomerRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">{leadToCustomerRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Deal Size</span>
              <span className="font-semibold">${avgDealSize.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Sales Cycle</span>
              <span className="font-semibold">{avgSalesCycle} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Deals</span>
              <span className="font-semibold">{totalOpportunities}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contact Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Contacts</span>
              <span className="font-semibold">{totalContacts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Leads</span>
              <span className="font-semibold">{leadContacts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Customers</span>
              <span className="font-semibold">{customerContacts}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Companies</span>
              <span className="font-semibold">{totalCompanies}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Customers</span>
              <span className="font-semibold">{customerCompanies}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Prospects</span>
              <span className="font-semibold">{prospectCompanies}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topOpportunities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No opportunities with amounts found.
            </div>
          ) : (
            <div className="space-y-3">
              {topOpportunities.map((opp, index) => (
                <div key={opp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{opp.title}</div>
                      <div className="text-sm text-gray-500">
                        {opp.stage.replace('_', ' ')} • {opp.probability || 0}% probability
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">${opp.amount?.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">
                      {opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : 'No close date'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/sales/opportunities'}>
              <Plus className="w-4 h-4 mr-2" />
              New Opportunity
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/sales/contacts'}>
              <Users className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/sales/companies'}>
              <Building className="w-4 h-4 mr-2" />
              Add Company
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/sales/leads'}>
              <Target className="w-4 h-4 mr-2" />
              Manage Leads
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


