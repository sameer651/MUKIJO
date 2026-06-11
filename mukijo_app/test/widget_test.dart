import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mukijo_app/main.dart';

void main() {
  testWidgets('App starts smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MukijoApp(isLoggedIn: false));
    await tester.pumpAndSettle();
  });
}
