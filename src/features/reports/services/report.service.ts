import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { BaseReportFilters, ReportData, SummaryMetrics, OperationalMetrics, SalesPerformanceMetrics } from '../types/report.types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { handleFirestoreError, OperationType } from '../../../lib/services';

export const reportService = {
  getDateRange(preset: BaseReportFilters['datePreset'], customStart?: Date, customEnd?: Date): { start: Date, end: Date } {
    const now = new Date();
    switch (preset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this_week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { 
          start: customStart ? startOfDay(customStart) : startOfDay(now), 
          end: customEnd ? endOfDay(customEnd) : endOfDay(now) 
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  },

  async getOperationalReport(filters: BaseReportFilters): Promise<ReportData> {
    try {
      const { start, end } = this.getDateRange(filters.datePreset, filters.startDate, filters.endDate);
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      // Hardening: Combine query parameters at the database level to limit collection scans
      const constraints: any[] = [
        where("createdAt", ">=", startTs),
        where("createdAt", "<=", endTs)
      ];

      // Scoped querying: If branchId is specified, query it directly inside Firestore
      if (filters.branchId) {
        constraints.push(where("branchId", "==", filters.branchId));
      }

      // Build Orders Query
      let ordersQuery = query(
        collection(db, "orders"),
        ...constraints
      );

      const ordersSnap = await getDocs(ordersQuery);
      
      let summary: SummaryMetrics = {
        totalOmset: 0,
        totalOrders: 0,
        activeOrders: 0,
        completedOrders: 0,
        repeatOrders: 0,
      };

      let operational: OperationalMetrics = {
        queueSurvey: 0,
        queueProcessing: 0,
        queueWarehouse: 0,
        queueDelivery: 0,
        queueCompleted: 0,
      };

      const salesMap = new Map<string, SalesPerformanceMetrics>();

      ordersSnap.forEach((doc) => {
        const data = doc.data();
        
        // Secondary security check (safety boundary check)
        if (filters.branchId && data.branchId !== filters.branchId) return;
        
        // Filter by specific user (sales)
        if (filters.userId && data.createdBy !== filters.userId) return;

        const omset = data.omset || data.angsuran * data.tenor || 0;
        summary.totalOrders += 1;
        summary.totalOmset += omset;

        const status = data.status || data.stage || 'survey';
        
        if (status === 'completed' || status === 'selesai') {
          summary.completedOrders += 1;
          operational.queueCompleted += 1;
        } else {
          summary.activeOrders += 1;
          
          if (status === 'survey') operational.queueSurvey += 1;
          else if (status === 'processing') operational.queueProcessing += 1;
          else if (status === 'warehouse' || status === 'gudang') operational.queueWarehouse += 1;
          else if (status === 'delivery' || status === 'kirim') operational.queueDelivery += 1;
        }

        // Sales Map Aggregation
        const salesId = data.createdBy;
        if (salesId) {
          if (!salesMap.has(salesId)) {
            salesMap.set(salesId, {
              userId: salesId,
              userName: data.ownerName || 'Unknown Sales', // Denormalized name preferred
              totalOrders: 0,
              totalOmset: 0,
              activeOrders: 0
            });
          }
          const s = salesMap.get(salesId)!;
          s.totalOrders += 1;
          s.totalOmset += omset;
          if (status !== 'completed' && status !== 'selesai') {
             s.activeOrders += 1;
          }
        }
      });

      return {
        summary,
        operational,
        salesPerformance: Array.from(salesMap.values()).sort((a,b) => b.totalOmset - a.totalOmset)
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "reports/operational");
    }
  }
};
