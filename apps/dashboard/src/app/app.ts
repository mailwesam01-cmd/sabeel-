import { Component, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SiteTank {
  id: string;
  name: string;
  tankName: string;
  city: string;
  neighborhood: string;
  capacityLiters: number;
  currentLiters: number;
  status: 'healthy' | 'leak' | 'overflow' | 'low' | 'refilling';
  levelPercent: number; // 0 to 100
  leakLitersPerDay: number;
  lastUpdated: string;
  batteryPercent: number;
  signalDbm: number;
  detectedSince: string;
  actionRequired: string;
  hourlyNightDrop: number;
  mapCoords: { top: number; left: number };
}

export interface MqttLogEntry {
  timestamp: string;
  topic: string;
  payload: string;
  status: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  // Active Navigation Tab
  activeTab = signal<'overview' | 'triage' | 'analytics' | 'simulator' | 'settings'>('overview');

  // Search & Filter
  searchQuery = signal<string>('');
  selectedFilter = signal<'all' | 'leak' | 'overflow' | 'healthy' | 'low'>('all');

  // Notification Toast
  toast = signal<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  private toastTimer: any = null;

  // Selected Site for Diagnostics Modal
  activeDiagnosticSite = signal<SiteTank | null>(null);

  // Main Sites Telemetry State
  sites = signal<SiteTank[]>([
    {
      id: 'site-1',
      name: 'عمارة الياسمين',
      tankName: 'خزان أ (العلوي)',
      city: 'عمان',
      neighborhood: 'خلدا',
      capacityLiters: 2000,
      currentLiters: 720,
      status: 'leak',
      levelPercent: 36,
      leakLitersPerDay: 480,
      lastUpdated: 'منذ دقيقة واحدة',
      batteryPercent: 92,
      signalDbm: -68,
      detectedSince: 'منذ يومين',
      actionRequired: 'فحص فوري لعوامة الخزان وشبكة التوزيع',
      hourlyNightDrop: 20,
      mapCoords: { top: 42, left: 48 }
    },
    {
      id: 'site-2',
      name: 'مسجد النور',
      tankName: 'الخزان الرئيسي الكبير',
      city: 'الزرقاء',
      neighborhood: 'حي معصوم',
      capacityLiters: 4000,
      currentLiters: 1800,
      status: 'leak',
      levelPercent: 45,
      leakLitersPerDay: 240,
      lastUpdated: 'منذ 3 دقائق',
      batteryPercent: 88,
      signalDbm: -74,
      detectedSince: 'منذ 4 أيام',
      actionRequired: 'إغلاق المحبس المغذي والموازنة الليلية',
      hourlyNightDrop: 10,
      mapCoords: { top: 38, left: 62 }
    },
    {
      id: 'site-3',
      name: 'مدرسة الأمل النموذجية',
      tankName: 'خزان جناح ب',
      city: 'إربد',
      neighborhood: 'الحي الجنوبي',
      capacityLiters: 3000,
      currentLiters: 3000,
      status: 'overflow',
      levelPercent: 100,
      leakLitersPerDay: 650,
      lastUpdated: 'منذ 30 ثانية',
      batteryPercent: 95,
      signalDbm: -62,
      detectedSince: 'منذ 5 ساعات',
      actionRequired: 'عطل في حساس الارتفاع - هدر مائي مستمر',
      hourlyNightDrop: 0,
      mapCoords: { top: 20, left: 45 }
    },
    {
      id: 'site-4',
      name: 'مجمع الرابية الطبي',
      tankName: 'خزان السطح المعقم',
      city: 'عمان',
      neighborhood: 'الرابية',
      capacityLiters: 2500,
      currentLiters: 1950,
      status: 'healthy',
      levelPercent: 78,
      leakLitersPerDay: 0,
      lastUpdated: 'منذ دقيقتين',
      batteryPercent: 99,
      signalDbm: -59,
      detectedSince: '-',
      actionRequired: 'لا يوجد - استهلاك ضمن المعدل الآمن',
      hourlyNightDrop: 0,
      mapCoords: { top: 48, left: 51 }
    },
    {
      id: 'site-5',
      name: 'عمارة السلام السكنية',
      tankName: 'خزان ج (الاحتياطي)',
      city: 'عمان',
      neighborhood: 'صويلح',
      capacityLiters: 1500,
      currentLiters: 270,
      status: 'low',
      levelPercent: 18,
      leakLitersPerDay: 0,
      lastUpdated: 'منذ 7 دقائق',
      batteryPercent: 81,
      signalDbm: -78,
      detectedSince: 'اليوم 01:15 ص',
      actionRequired: 'مستوى مياه منخفض - جدولة طلب صهريج',
      hourlyNightDrop: 0,
      mapCoords: { top: 35, left: 46 }
    },
    {
      id: 'site-6',
      name: 'فيلا المهندس وسام',
      tankName: 'الخزان الأرضي الرئيسي',
      city: 'عمان',
      neighborhood: 'دابوق',
      capacityLiters: 5000,
      currentLiters: 4400,
      status: 'refilling',
      levelPercent: 88,
      leakLitersPerDay: 0,
      lastUpdated: 'الآن (متدفق)',
      batteryPercent: 100,
      signalDbm: -55,
      detectedSince: 'منذ 25 دقيقة',
      actionRequired: 'ضخ بلدية نشط بمعدل 42 لتر/دقيقة',
      hourlyNightDrop: 0,
      mapCoords: { top: 44, left: 44 }
    }
  ]);

  // Computed KPIs
  totalSitesCount = computed(() => this.sites().length);
  activeLeaksCount = computed(() => this.sites().filter(s => s.status === 'leak').length);
  totalDailyWasteLiters = computed(() => this.sites().reduce((acc, s) => acc + s.leakLitersPerDay, 0));
  avgWaterLevel = computed(() => {
    const list = this.sites();
    if (list.length === 0) return 0;
    return Math.round(list.reduce((acc, s) => acc + s.levelPercent, 0) / list.length);
  });

  // Filtered Sites
  filteredSites = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedFilter();

    return this.sites().filter(site => {
      const matchesFilter = filter === 'all' ? true : site.status === filter;
      const matchesQuery = !query || 
        site.name.toLowerCase().includes(query) || 
        site.city.toLowerCase().includes(query) || 
        site.neighborhood.toLowerCase().includes(query) ||
        site.tankName.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  });

  // Live Simulator State
  simTargetSiteId = signal<string>('site-1');
  simActiveMode = signal<'idle' | 'leak' | 'refill' | 'overflow'>('idle');
  private simInterval: any = null;

  selectedSimSite = computed(() => {
    return this.sites().find(s => s.id === this.simTargetSiteId()) || this.sites()[0];
  });

  // Live MQTT Telemetry Logs
  mqttLogs = signal<MqttLogEntry[]>([
    {
      timestamp: '04:12:05',
      topic: 'sabeel/site-1/telemetry',
      payload: '{"tank_id":"T-01","distance_cm":128,"level_pct":36,"leak_alert":true,"liters":720}',
      status: 'ALERT'
    },
    {
      timestamp: '04:11:45',
      topic: 'sabeel/site-6/telemetry',
      payload: '{"tank_id":"T-06","distance_cm":24,"level_pct":88,"refill_event":true,"flow_rate":42}',
      status: 'REFILL'
    },
    {
      timestamp: '04:10:30',
      topic: 'sabeel/site-4/telemetry',
      payload: '{"tank_id":"T-04","distance_cm":44,"level_pct":78,"leak_alert":false,"v_bat":3.95}',
      status: 'OK'
    }
  ]);

  // Hardware & Node Settings Form Model
  settingsForm = {
    mqttBroker: 'mqtt://localhost:1883',
    mqttTopic: 'sabeel/tank/+/telemetry',
    nightLeakThreshold: 10, // Liters per hour
    standardTankHeight: 200, // cm
    sensorOffset: 15, // cm dead zone
    emergencyPhone: '+962 7 9000 0000',
    autoDispatch: true
  };

  ngOnDestroy(): void {
    this.stopSimulation();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // Navigation
  setTab(tab: 'overview' | 'triage' | 'analytics' | 'simulator' | 'settings'): void {
    this.activeTab.set(tab);
  }

  // Toast Notification
  showToast(message: string, type: 'success' | 'warning' | 'info' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  // Diagnostics Modal
  openDiagnostics(site: SiteTank): void {
    this.activeDiagnosticSite.set(site);
  }

  closeDiagnostics(): void {
    this.activeDiagnosticSite.set(null);
  }

  // Mark Leak as Resolved
  resolveLeak(site: SiteTank): void {
    this.sites.update(list => list.map(s => {
      if (s.id === site.id) {
        return {
          ...s,
          status: 'healthy',
          leakLitersPerDay: 0,
          hourlyNightDrop: 0,
          detectedSince: '-',
          actionRequired: 'تم حل المشكلة وتأكيد سلامة العوامة'
        };
      }
      return s;
    }));

    if (this.activeDiagnosticSite()?.id === site.id) {
      this.activeDiagnosticSite.set(null);
    }

    this.showToast(`تم إغلاق البلاغ وتأكيد إصلاح الخلل في ${site.name} بنجاح!`, 'success');
  }

  // Dispatch Technician
  dispatchTechnician(site: SiteTank): void {
    this.showToast(`تم إرسال إشعار فني للموقع: ${site.name} (${site.neighborhood}) عبر WhatsApp & SMS!`, 'info');
    
    // Add to MQTT Logs
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    this.mqttLogs.update(logs => [
      {
        timestamp: timeStr,
        topic: `sabeel/${site.id}/dispatch`,
        payload: JSON.stringify({ action: 'DISPATCH_TECH', site: site.name, phone: this.settingsForm.emergencyPhone }),
        status: 'DISPATCH'
      },
      ...logs.slice(0, 19)
    ]);
  }

  // Simulator Controls
  onSliderChange(newLevel: number): void {
    const targetId = this.simTargetSiteId();
    this.sites.update(list => list.map(s => {
      if (s.id === targetId) {
        const currentLiters = Math.round((newLevel / 100) * s.capacityLiters);
        let status = s.status;
        if (newLevel <= 20) status = 'low';
        else if (newLevel >= 98 && status !== 'leak') status = 'healthy';
        
        return {
          ...s,
          levelPercent: newLevel,
          currentLiters: currentLiters,
          status: status
        };
      }
      return s;
    }));
    this.logTelemetry(targetId, newLevel);
  }

  startLeakSimulation(): void {
    this.stopSimulation();
    this.simActiveMode.set('leak');
    const targetId = this.simTargetSiteId();

    this.showToast('تم تفعيل سيناريو التسريب المائي التدريجي (هبوط مستمر)', 'warning');

    this.simInterval = setInterval(() => {
      const currentSite = this.sites().find(s => s.id === targetId);
      if (!currentSite || currentSite.levelPercent <= 5) {
        this.stopSimulation();
        return;
      }

      const nextLevel = Math.max(0, currentSite.levelPercent - 1);
      const nextLiters = Math.round((nextLevel / 100) * currentSite.capacityLiters);

      this.sites.update(list => list.map(s => {
        if (s.id === targetId) {
          return {
            ...s,
            levelPercent: nextLevel,
            currentLiters: nextLiters,
            status: 'leak',
            leakLitersPerDay: 520,
            hourlyNightDrop: 22,
            actionRequired: '⚠️ إنذار: رصد هبوط ميكانيكي مستمر في مستوى الماء'
          };
        }
        return s;
      }));

      this.logTelemetry(targetId, nextLevel, true, false);
    }, 1800);
  }

  startRefillSimulation(): void {
    this.stopSimulation();
    this.simActiveMode.set('refill');
    const targetId = this.simTargetSiteId();

    this.showToast('تم تفعيل سيناريو تدفق وضخ المياه (تعبئة الخزان)', 'info');

    this.simInterval = setInterval(() => {
      const currentSite = this.sites().find(s => s.id === targetId);
      if (!currentSite || currentSite.levelPercent >= 96) {
        this.stopSimulation();
        this.showToast('اكتملت تعبئة الخزان بنجاح!', 'success');
        return;
      }

      const nextLevel = Math.min(96, currentSite.levelPercent + 3);
      const nextLiters = Math.round((nextLevel / 100) * currentSite.capacityLiters);

      this.sites.update(list => list.map(s => {
        if (s.id === targetId) {
          return {
            ...s,
            levelPercent: nextLevel,
            currentLiters: nextLiters,
            status: 'refilling',
            leakLitersPerDay: 0,
            hourlyNightDrop: 0,
            actionRequired: 'ضخ بلدية نشط - الخزان قيد الامتلاء'
          };
        }
        return s;
      }));

      this.logTelemetry(targetId, nextLevel, false, true);
    }, 1200);
  }

  triggerOverflowSimulation(): void {
    this.stopSimulation();
    this.simActiveMode.set('overflow');
    const targetId = this.simTargetSiteId();

    this.sites.update(list => list.map(s => {
      if (s.id === targetId) {
        return {
          ...s,
          levelPercent: 100,
          currentLiters: s.capacityLiters,
          status: 'overflow',
          leakLitersPerDay: 750,
          actionRequired: '🚨 طوفان مياه! العوامة لا توقف تدفق المضخة'
        };
      }
      return s;
    }));

    this.logTelemetry(targetId, 100, false, false, true);
    this.showToast('🚨 طوفان مياه: تم إطلاق جرس الإنذار وإيقاف المضخة التلقائي!', 'warning');
  }

  stopSimulation(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.simActiveMode.set('idle');
  }

  resetSiteToNormal(): void {
    this.stopSimulation();
    const targetId = this.simTargetSiteId();

    this.sites.update(list => list.map(s => {
      if (s.id === targetId) {
        const normalLiters = Math.round(0.75 * s.capacityLiters);
        return {
          ...s,
          levelPercent: 75,
          currentLiters: normalLiters,
          status: 'healthy',
          leakLitersPerDay: 0,
          hourlyNightDrop: 0,
          detectedSince: '-',
          actionRequired: 'النظام سليم ولا توجد تسريبات'
        };
      }
      return s;
    }));

    this.logTelemetry(targetId, 75);
    this.showToast('تمت إعادة ضبط الخزان إلى الحالة الطبيعية (75%)', 'success');
  }

  private logTelemetry(siteId: string, levelPct: number, isLeak: boolean = false, isRefill: boolean = false, isOverflow: boolean = false): void {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const distanceCm = Math.round(200 - (levelPct / 100) * 180);
    const site = this.sites().find(s => s.id === siteId);
    const liters = site ? Math.round((levelPct / 100) * site.capacityLiters) : 0;

    let status = 'NORMAL';
    if (isOverflow) status = 'OVERFLOW';
    else if (isLeak) status = 'LEAK_ALARM';
    else if (isRefill) status = 'REFILL';

    const entry: MqttLogEntry = {
      timestamp: timeStr,
      topic: `sabeel/${siteId}/telemetry`,
      payload: JSON.stringify({
        tank_id: siteId,
        dist_cm: distanceCm,
        pct: levelPct,
        liters: liters,
        leak: isLeak,
        overflow: isOverflow
      }),
      status: status
    };

    this.mqttLogs.update(logs => [entry, ...logs.slice(0, 24)]);
  }

  // Export Technical Report as CSV
  exportCsvReport(): void {
    const list = this.sites();
    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic excel compatibility
    csvContent += 'المعرف,اسم الموقع,الخزان,المحافظة,المنطقة,السعة (لتر),المستوى الحالي (لتر),النسبة المئوية,الحالة,الفاقد المقدر (لتر/يوم),تاريخ الاكتشاف,الإجراء المطلوب\n';

    list.forEach(s => {
      const statusArabic = s.status === 'leak' ? 'تسريب مستمر' :
                           s.status === 'overflow' ? 'طوفان مائي' :
                           s.status === 'refilling' ? 'جاري التعبئة' :
                           s.status === 'low' ? 'منسوب منخفض' : 'سليم';
      csvContent += `"${s.id}","${s.name}","${s.tankName}","${s.city}","${s.neighborhood}","${s.capacityLiters}","${s.currentLiters}","${s.levelPercent}%","${statusArabic}","${s.leakLitersPerDay}","${s.detectedSince}","${s.actionRequired}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_سبيل_لإدارة_المياه_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('تم تحميل التقرير بصيغة CSV بنجاح!', 'success');
  }

  // Save Settings
  saveSettings(): void {
    try {
      localStorage.setItem('sabeel_settings', JSON.stringify(this.settingsForm));
      this.showToast('تم حفظ إعدادات النظام وشبكة MQTT بنجاح!', 'success');
    } catch (e) {
      this.showToast('تم تحديث الإعدادات مؤقتاً في الذاكرة!', 'info');
    }
  }

  // Helper Methods for UI Badges
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'leak': return 'badge-leak';
      case 'overflow': return 'badge-overflow';
      case 'refilling': return 'badge-refill';
      case 'low': return 'badge-low';
      case 'healthy': default: return 'badge-healthy';
    }
  }

  getStatusArabicLabel(status: string): string {
    switch (status) {
      case 'leak': return 'تسريب مستمر';
      case 'overflow': return 'طوفان (فاض)';
      case 'refilling': return 'ضخ نشط';
      case 'low': return 'مستوى منخفض';
      case 'healthy': default: return 'سليم ومستقر';
    }
  }

  getProgressBarColor(level: number, status: string): string {
    if (status === 'leak') return 'var(--leak-alert)';
    if (status === 'overflow') return 'var(--overflow-alert)';
    if (level <= 20) return 'var(--level-low)';
    return 'var(--level-healthy)';
  }
}
