import 'package:flutter/material.dart';
import '../theme.dart';

class TankVisual extends StatelessWidget {
  final double fillPercentage;
  final String label;

  const TankVisual({
    Key? key,
    required this.fillPercentage,
    required this.label,
  }) : super(key: key);

  Color _getWaterColor() {
    if (fillPercentage > 0.5) return SabeelTheme.levelHealthy;
    if (fillPercentage > 0.2) return SabeelTheme.levelLow;
    return SabeelTheme.levelCritical;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      height: 250,
      decoration: BoxDecoration(
        color: SabeelTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SabeelTheme.muted.withOpacity(0.3), width: 3),
        boxShadow: [
          BoxShadow(
            color: SabeelTheme.ink.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            // Water Fill
            FractionallySizedBox(
              heightFactor: fillPercentage.clamp(0.0, 1.0),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      _getWaterColor().withOpacity(0.8),
                      _getWaterColor(),
                    ],
                  ),
                ),
              ),
            ),
            // Percentage Text
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${(fillPercentage * 100).toInt()}%',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          color: fillPercentage > 0.4 ? Colors.white : SabeelTheme.ink,
                        ),
                  ),
                  Text(
                    label,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: fillPercentage > 0.4 ? Colors.white70 : SabeelTheme.muted,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
