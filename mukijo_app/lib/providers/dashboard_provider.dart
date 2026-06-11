import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/dashboard_overview.dart';

final _api = ApiClient();

final dashboardProvider = FutureProvider<DashboardOverview>((ref) async {
  final data = await _api.get('/dashboard/overview');
  return DashboardOverview.fromJson(data);
});
