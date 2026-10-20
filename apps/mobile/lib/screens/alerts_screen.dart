import 'package:flutter/material.dart';
import '../theme.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('التنبيهات'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildAlertCard(
            context,
            icon: Icons.water_drop,
            color: SabeelTheme.leakAlert,
            title: 'تسريب مستمر مكتشف!',
            description: 'الخزان يفقد حوالي 48 لتر يومياً. يرجى فحص العوامة أو الأنابيب.',
            time: 'منذ ساعتين',
            actionText: 'تم الإصلاح',
          ),
          const SizedBox(height: 12),
          _buildAlertCard(
            context,
            icon: Icons.waves,
            color: SabeelTheme.levelHealthy,
            title: 'جاري تعبئة الخزان',
            description: 'تم رصد زيادة في المياه بمقدار 300 لتر حتى الآن.',
            time: 'أمس 04:30 ص',
            actionText: 'التفاصيل',
          ),
        ],
      ),
    );
  }

  Widget _buildAlertCard(BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String description,
    required String time,
    required String actionText,
  }) {
    return Card(
      elevation: 0,
      color: SabeelTheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withOpacity(0.3), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18, color: color)),
                ),
                Text(time, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12)),
              ],
            ),
            const SizedBox(height: 12),
            Text(description, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(foregroundColor: color),
                child: Text(actionText),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
