import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/venue.dart';
import '../models/slot.dart';

final _api = ApiClient();

final venueSportFilterProvider = StateProvider<String>((ref) => 'all');
final venueSearchQueryProvider = StateProvider<String>((ref) => '');
final venueSelectedDateProvider = StateProvider<String>((ref) => DateTime.now().toIso8601String().split('T')[0]);

final venuesProvider = FutureProvider<List<Venue>>((ref) async {
  final sport = ref.watch(venueSportFilterProvider);
  final query = ref.watch(venueSearchQueryProvider);
  
  final params = <String, dynamic>{};
  if (sport != 'all') params['sport'] = sport;
  if (query.isNotEmpty) params['location'] = query;

  final data = await _api.get('/venues', params: params);
  return (data as List).map((j) => Venue.fromJson(j)).toList();
});

final venueSlotsProvider = FutureProvider.family<List<Slot>, int>((ref, venueId) async {
  final dateStr = ref.watch(venueSelectedDateProvider);
  final data = await _api.get('/venues/$venueId/slots', params: {'date_str': dateStr});
  return (data as List).map((j) => Slot.fromJson(j)).toList();
});

class VenuesNotifier extends AsyncNotifier<List<Venue>> {
  @override
  Future<List<Venue>> build() async {
    final sport = ref.watch(venueSportFilterProvider);
    final query = ref.watch(venueSearchQueryProvider);
    final params = <String, dynamic>{};
    if (sport != 'all') params['sport'] = sport;
    if (query.isNotEmpty) params['location'] = query;

    final data = await _api.get('/venues', params: params);
    return (data as List).map((j) => Venue.fromJson(j)).toList();
  }

  Future<void> prePopulateDemo(int userId) async {
    state = const AsyncValue.loading();
    try {
      final demoVenues = [
        {
          "owner_id": userId,
          "name": "Camp Nou Arena",
          "location": "Sector 62, Noida",
          "latitude": 28.62,
          "longitude": 77.37,
          "sports_supported": '["football", "tennis"]',
          "amenities": '["Free Parking", "Showers", "Drinking Water"]',
          "rating": 4.8
        },
        {
          "owner_id": userId,
          "name": "Smash Badminton Center",
          "location": "Gachibowli, Hyderabad",
          "latitude": 17.44,
          "longitude": 78.34,
          "sports_supported": '["badminton", "pickleball"]',
          "amenities": '["AC Courts", "Pro Shop", "Locker Room"]',
          "rating": 4.9
        },
        {
          "owner_id": userId,
          "name": "Wankhede Cricket Turf",
          "location": "Bandra West, Mumbai",
          "latitude": 19.05,
          "longitude": 72.82,
          "sports_supported": '["cricket", "football"]',
          "amenities": '["Floodlights", "Cafeteria", "Coaching Equipment"]',
          "rating": 4.7
        }
      ];

      for (var dv in demoVenues) {
        final venueJson = await _api.post('/venues', dv);
        final venue = Venue.fromJson(venueJson);
        
        final List<dynamic> sports = venue.sportsSupported;
        final mockSlots = <Map<String, dynamic>>[];

        for (int dayOffset = 0; dayOffset < 3; dayOffset++) {
          final datePart = DateTime.now().add(Duration(days: dayOffset)).toIso8601String().split('T')[0];
          final times = [
            {"start": "07:00", "end": "08:00", "price": 1200},
            {"start": "09:00", "end": "10:00", "price": 1000},
            {"start": "17:00", "end": "18:00", "price": 1500},
            {"start": "19:00", "end": "20:00", "price": 1800}
          ];

          for (int i = 0; i < times.length; i++) {
            final t = times[i];
            mockSlots.add({
              "venue_id": venue.id,
              "sport": sports[i % sports.length],
              "start_time": "${datePart}T${t['start']}:00",
              "end_time": "${datePart}T${t['end']}:00",
              "base_price": t['price'],
              "current_price": t['price'],
              "is_blocked": false
            });
          }
        }
        
        // Convert mockSlots to List<Map<String, dynamic>> inside the POST payload
        await _api.post('/venues/${venue.id}/slots', mockSlots);
      }
      ref.invalidateSelf();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> bookSlot({
    required int userId,
    required int slotId,
    required int amountPaid,
  }) async {
    final body = {
      'user_id': userId,
      'slot_id': slotId,
      'amount_paid': amountPaid,
      'payment_status': 'paid',
    };
    final response = await _api.post('/bookings', body);
    ref.invalidate(venuesProvider);
    return response as Map<String, dynamic>;
  }
}

final venuesNotifierProvider = AsyncNotifierProvider<VenuesNotifier, List<Venue>>(VenuesNotifier.new);
