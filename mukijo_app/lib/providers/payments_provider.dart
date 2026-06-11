import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/payment.dart';

final _api = ApiClient();

final paymentsProvider = FutureProvider.family<List<Payment>, String>((ref, status) async {
  final data = await _api.get('/payments', params: {'status': status});
  return (data as List).map((j) => Payment.fromJson(j)).toList();
});

final allPaymentsProvider = FutureProvider<List<Payment>>((ref) async {
  final data = await _api.get('/payments');
  return (data as List).map((j) => Payment.fromJson(j)).toList();
});

final paymentsSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final data = await _api.get('/payments/summary');
  return data as Map<String, dynamic>;
});

class PaymentsNotifier extends AsyncNotifier<List<Payment>> {
  @override
  Future<List<Payment>> build() async {
    final data = await _api.get('/payments');
    return (data as List).map((j) => Payment.fromJson(j)).toList();
  }

  Future<void> createPayment(Map<String, dynamic> data) async {
    await _api.post('/payments', data);
    ref.invalidateSelf();
    ref.invalidate(paymentsSummaryProvider);
    ref.invalidate(allPaymentsProvider);
  }

  Future<void> markAsPaid(int paymentId) async {
    await _api.put('/payments/$paymentId', {'status': 'paid'});
    ref.invalidateSelf();
    ref.invalidate(paymentsSummaryProvider);
    ref.invalidate(allPaymentsProvider);
  }

  Future<void> deletePayment(int paymentId) async {
    await _api.delete('/payments/$paymentId');
    ref.invalidateSelf();
    ref.invalidate(paymentsSummaryProvider);
    ref.invalidate(allPaymentsProvider);
  }
}

final paymentsNotifierProvider =
    AsyncNotifierProvider<PaymentsNotifier, List<Payment>>(PaymentsNotifier.new);
