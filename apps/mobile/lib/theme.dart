import 'package:flutter/material.dart';

class SabeelTheme {
  static const Color primary = Color(0xFF00507A);
  static const Color primaryLight = Color(0xFF2E86AB);
  static const Color waterFill = Color(0xFF4CC9F0);
  static const Color waterFillDeep = Color(0xFF0077B6);
  static const Color accent = Color(0xFFF9C74F);
  
  static const Color levelHealthy = Color(0xFF2A9D8F);
  static const Color levelLow = Color(0xFFF9C74F);
  static const Color levelCritical = Color(0xFFE63946);
  
  static const Color leakAlert = Color(0xFF9D0208);
  static const Color overflowAlert = Color(0xFFF3722C);
  
  static const Color surface = Color(0xFFFFFFFF);
  static const Color canvas = Color(0xFFF2F7FA);
  static const Color ink = Color(0xFF04263A);
  static const Color muted = Color(0xFF5B7A8C);

  static ThemeData get lightTheme {
    return ThemeData(
      primaryColor: primary,
      scaffoldBackgroundColor: canvas,
      fontFamily: 'IBM Plex Sans Arabic', // Use Google Fonts in real app
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: surface,
        elevation: 0,
        centerTitle: true,
      ),
      colorScheme: ColorScheme.light(
        primary: primary,
        secondary: accent,
        surface: surface,
        error: leakAlert,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: ink, fontSize: 56, fontWeight: FontWeight.w600),
        titleLarge: TextStyle(color: ink, fontSize: 24, fontWeight: FontWeight.w700),
        bodyLarge: TextStyle(color: ink, fontSize: 16),
        bodyMedium: TextStyle(color: muted, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: ink,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
    );
  }
}
