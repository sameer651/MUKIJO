import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/fundraising_campaign.dart';

final _api = ApiClient();

final fundraisingProvider = FutureProvider<List<FundraisingCampaign>>((ref) async {
  final data = await _api.get('/fundraising');
  return (data as List).map((j) => FundraisingCampaign.fromJson(j)).toList();
});

class FundraisingNotifier extends AsyncNotifier<List<FundraisingCampaign>> {
  @override
  Future<List<FundraisingCampaign>> build() async {
    final data = await _api.get('/fundraising');
    return (data as List).map((j) => FundraisingCampaign.fromJson(j)).toList();
  }

  Future<void> createCampaign(Map<String, dynamic> data) async {
    await _api.post('/fundraising', data);
    ref.invalidateSelf();
    ref.invalidate(fundraisingProvider);
  }

  Future<void> deleteCampaign(int campaignId) async {
    await _api.delete('/fundraising/$campaignId');
    ref.invalidateSelf();
    ref.invalidate(fundraisingProvider);
  }

  Future<void> recordDonation(int campaignId, int amount, String donorName) async {
    await _api.post('/fundraising/$campaignId/donate', {
      'amount': amount,
      'donor_name': donorName,
      'owner_id': 0, // will be resolved by api client
    });
    ref.invalidateSelf();
    ref.invalidate(fundraisingProvider);
  }
}

final fundraisingNotifierProvider =
    AsyncNotifierProvider<FundraisingNotifier, List<FundraisingCampaign>>(FundraisingNotifier.new);
