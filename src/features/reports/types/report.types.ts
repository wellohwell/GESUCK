import { Timestamp } from 'firebase/firestore';

export interface BaseReportFilters {
  branchId?: string;
  userId?: string; // e.g. for sales
  startDate?: Date;
  endDate?: Date;
  datePreset?: 'today' | 'this_week' | 'this_month' | 'custom';
}

export interface SummaryMetrics {
  totalOmset: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  repeatOrders: number;
}

export interface OperationalMetrics {
  queueSurvey: number;
  queueProcessing: number;
  queueWarehouse: number;
  queueDelivery: number;
  queueCompleted: number;
}

export interface SalesPerformanceMetrics {
  userId: string;
  userName: string;
  totalOrders: number;
  totalOmset: number;
  activeOrders: number;
}

export interface ReportData {
  summary: SummaryMetrics;
  operational: OperationalMetrics;
  salesPerformance?: SalesPerformanceMetrics[];
}
