import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Premium Sporty Dark Theme Colors
  static const Color primary = Color(0xFFBFFE00); // Electric Lime
  static const Color primaryDark = Color(0xFF9ECE00);
  static const Color primaryLight = Color(0x1ABFFE00); // 10% opacity Lime
  
  static const Color secondary = Color(0xFF00F0FF); // Hyper Cyan
  static const Color accent = Color(0xFFFFA000); // Warm amber

  // Background & Surface (Dark Theme)
  static const Color bgLight = Color(0xFF08080C);
  static const Color bgCard = Color(0xFF12121A);
  static const Color surfaceLight = Color(0xFF1E1E28);

  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Status Colors
  static const Color success = Color(0xFF00B453);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color pending = Color(0xFFF59E0B);
  static const Color paid = Color(0xFF00B453);
  static const Color overdue = Color(0xFFEF4444);
  static const Color cancelled = Color(0xFF9CA3AF);

  // Border
  static const Color borderColor = Color(0xFF1E293B);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFBFFE00), Color(0xFF00F0FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient greenGradient = LinearGradient(
    colors: [Color(0xFF00B453), Color(0xFF00D260)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient orangeGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient blueGradient = LinearGradient(
    colors: [Color(0xFF00F0FF), Color(0xFF00B8FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient redGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFF87171)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Box Shadows for Cards
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.3),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),
  ];

  static ThemeData get lightTheme {
    final base = ThemeData.dark();
    return base.copyWith(
      scaffoldBackgroundColor: bgLight,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: bgCard,
        error: error,
        onPrimary: Color(0xFF050508),
        onSecondary: Color(0xFF050508),
        onSurface: textPrimary,
        onError: Colors.white,
      ),
      textTheme: GoogleFonts.interTextTheme(base.textTheme).copyWith(
        displayLarge: GoogleFonts.inter(color: textPrimary, fontSize: 32, fontWeight: FontWeight.w800),
        displayMedium: GoogleFonts.inter(color: textPrimary, fontSize: 24, fontWeight: FontWeight.w800),
        displaySmall: GoogleFonts.inter(color: textPrimary, fontSize: 20, fontWeight: FontWeight.w700),
        headlineMedium: GoogleFonts.inter(color: textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
        titleLarge: GoogleFonts.inter(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
        titleMedium: GoogleFonts.inter(color: textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
        bodyLarge: GoogleFonts.inter(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w500),
        bodyMedium: GoogleFonts.inter(color: textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
        bodySmall: GoogleFonts.inter(color: textMuted, fontSize: 12, fontWeight: FontWeight.w500),
        labelLarge: GoogleFonts.inter(color: textPrimary, fontSize: 14, fontWeight: FontWeight.w700),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: bgLight,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 2,
        titleTextStyle: GoogleFonts.inter(color: textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
        iconTheme: const IconThemeData(color: textPrimary),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: borderColor, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: error),
        ),
        labelStyle: GoogleFonts.inter(color: textSecondary, fontSize: 14),
        hintStyle: GoogleFonts.inter(color: textMuted, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: const Color(0xFF050508),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5, fontStyle: FontStyle.italic),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, fontStyle: FontStyle.italic),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: Color(0xFF050508),
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: bgCard,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
        unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
      ),
      dividerTheme: const DividerThemeData(
        color: borderColor,
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary),
        side: BorderSide.none,
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: primary,
        unselectedLabelColor: textMuted,
        indicatorColor: primary,
        labelStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
        indicatorSize: TabBarIndicatorSize.tab,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: surfaceLight,
        contentTextStyle: GoogleFonts.inter(color: textPrimary, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Status helpers
  static Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'open':
      case 'active':
      case 'accepted':
      case 'present':
        return success;
      case 'pending':
      case 'waitlisted':
        return warning;
      case 'overdue':
      case 'closed':
      case 'declined':
      case 'absent':
        return error;
      case 'cancelled':
      case 'not_marked':
        return textMuted;
      case 'full':
      case 'completed':
        return info;
      default:
        return textSecondary;
    }
  }

  static LinearGradient statusGradient(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'open':
      case 'active':
        return greenGradient;
      case 'overdue':
      case 'closed':
        return redGradient;
      case 'pending':
      case 'waitlisted':
        return orangeGradient;
      default:
        return primaryGradient;
    }
  }
}
