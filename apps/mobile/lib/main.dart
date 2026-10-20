import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'theme.dart';
import 'screens/home_screen.dart';
import 'screens/alerts_screen.dart';

void main() {
  runApp(const SabeelApp());
}

class SabeelApp extends StatelessWidget {
  const SabeelApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final view = Uri.base.queryParameters['view'] ?? 'home';
    Widget homeWidget = const HomeScreen();
    if (view == 'ground') {
      homeWidget = const HomeScreen(initialIndex: 1);
    } else if (view == 'alerts') {
      homeWidget = const AlertsScreen();
    } else if (view == 'settings') {
      homeWidget = const HomeScreen(showSettingsOnInit: true);
    }

    return MaterialApp(
      title: 'Sabeel - سبيل',
      debugShowCheckedModeBanner: false,
      theme: SabeelTheme.lightTheme,
      // RTL Setup for Arabic
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ar', 'AE'), // Arabic
        Locale('en', 'US'), // English fallback
      ],
      locale: const Locale('ar', 'AE'), // Default to Arabic
      home: homeWidget,
    );
  }
}
