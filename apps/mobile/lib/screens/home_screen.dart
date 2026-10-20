import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/tank_visual.dart';
import 'alerts_screen.dart';

class HomeScreen extends StatefulWidget {
  final int initialIndex;
  final bool showSettingsOnInit;

  const HomeScreen({
    Key? key,
    this.initialIndex = 0,
    this.showSettingsOnInit = false,
  }) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late int _selectedTankIndex;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _selectedTankIndex = widget.initialIndex;
    if (widget.showSettingsOnInit) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _showSettingsDialog());
    }
  }
  final List<Map<String, dynamic>> _tanks = [
    {
      'name': 'الخزان الرئيسي (العلوي)',
      'capacity': 2000,
      'level': 0.64,
      'daysLeft': 4,
      'nextSupply': 'الثلاثاء',
      'hasAlert': true,
      'status': 'مستقر',
    },
    {
      'name': 'الخزان الأرضي (الاحتياطي)',
      'capacity': 5000,
      'level': 0.88,
      'daysLeft': 9,
      'nextSupply': 'الأحد',
      'hasAlert': false,
      'status': 'تغذية بلدية نشطة',
    },
  ];


  Map<String, dynamic> get _currentTank => _tanks[_selectedTankIndex];

  void _refreshTelemetry() async {
    setState(() => _isRefreshing = true);
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() {
      _isRefreshing = false;
      // Slight simulated variation
      if (_currentTank['level'] > 0.1) {
        _currentTank['level'] = (_currentTank['level'] - 0.01).clamp(0.0, 1.0);
      }
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('تم استلام أحدث قراءة من حساس ESP32 (${(_currentTank['level'] * 100).toInt()}%)'),
          duration: const Duration(seconds: 2),
          backgroundColor: SabeelTheme.primary,
        ),
      );
    }
  }

  void _simulateRefill() {
    setState(() {
      _currentTank['level'] = (_currentTank['level'] + 0.15).clamp(0.0, 1.0);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🌊 تم رصد تدفق مياه جديد (تعبئة الخزان)!'),
        backgroundColor: SabeelTheme.levelHealthy,
      ),
    );
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إعدادات الخزان والحساس'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('المعرف: ESP32-SABEEL-01', style: TextStyle(color: SabeelTheme.muted, fontSize: 13)),
            const SizedBox(height: 8),
            Text('سيرفر MQTT: 192.168.1.100:1883', style: TextStyle(color: SabeelTheme.muted, fontSize: 13)),
            const SizedBox(height: 8),
            Text('سعة الخزان: ${_currentTank['capacity']} لتر', style: TextStyle(color: SabeelTheme.muted, fontSize: 13)),
            const SizedBox(height: 8),
            const Text('وضع المراقبة: فحص تسريب ليلي (Active)', style: TextStyle(color: SabeelTheme.levelHealthy, fontSize: 13, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إغلاق'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final double level = _currentTank['level'];
    final int capacity = _currentTank['capacity'];
    final int remainingLitres = (level * capacity).round();
    final int daysLeft = _currentTank['daysLeft'];
    final String nextSupply = _currentTank['nextSupply'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('سَـبـيـل · مراقبة الخزانات', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: _isRefreshing 
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Icon(Icons.refresh),
            tooltip: 'تحديث القراءة اللحظية',
            onPressed: _isRefreshing ? null : _refreshTelemetry,
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'إعدادات الحساس',
            onPressed: _showSettingsDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Tank Selector Tabs
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: SabeelTheme.muted.withOpacity(0.2)),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: List.generate(_tanks.length, (index) {
                    final isSelected = _selectedTankIndex == index;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedTankIndex = index),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? SabeelTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            index == 0 ? 'الخزان العلوي' : 'الخزان الأرضي',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isSelected ? Colors.white : SabeelTheme.ink,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),

              const SizedBox(height: 20),

              // Tank Visualizer Widget
              Center(
                child: TankVisual(
                  fillPercentage: level,
                  label: _currentTank['name'],
                ),
              ),

              const SizedBox(height: 24),

              // Water Status Text
              Text(
                '≈ $remainingLitres لتر متبقي',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 26, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'من أصل $capacity لتر · يكفي لحوالي $daysLeft أيام',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: SabeelTheme.muted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: SabeelTheme.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '🗓️ موعد الضخ البلدي القادم: يوم $nextSupply',
                  style: const TextStyle(color: SabeelTheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),

              const SizedBox(height: 24),

              // Interactive Action Pills
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _simulateRefill,
                      icon: const Icon(Icons.water_drop, size: 18),
                      label: const Text('محاكاة تعبئة (+15%)', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: SabeelTheme.primaryLight,
                        side: const BorderSide(color: SabeelTheme.primaryLight),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _refreshTelemetry,
                      icon: const Icon(Icons.sync, size: 18),
                      label: const Text('قراءة ESP32 الآن', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: SabeelTheme.muted,
                        side: BorderSide(color: SabeelTheme.muted.withOpacity(0.4)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Alerts Navigation Button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const AlertsScreen()),
                    );
                  },
                  icon: const Icon(Icons.notifications_active),
                  label: const Text('تنبيهات التسريب والصيانة (1)', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SabeelTheme.accent,
                    foregroundColor: SabeelTheme.ink,
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
