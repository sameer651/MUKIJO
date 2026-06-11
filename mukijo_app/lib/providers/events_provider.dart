import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/event.dart';
import '../models/event_registration.dart';

final _api = ApiClient();

// ─── All Events ──────────────────────────────────────────────────────────────

final eventsProvider = FutureProvider<List<Event>>((ref) async {
  final data = await _api.get('/events');
  return (data as List).map((j) => Event.fromJson(j)).toList();
});

// ─── Single Event Detail ─────────────────────────────────────────────────────

final eventDetailProvider = FutureProvider.family<Event, int>((ref, eventId) async {
  final data = await _api.get('/events/$eventId');
  return Event.fromJson(data);
});

// ─── Event Participants ───────────────────────────────────────────────────────

final eventParticipantsProvider =
    FutureProvider.family<List<EventRegistration>, int>((ref, eventId) async {
  final data = await _api.get('/events/$eventId/participants');
  return (data as List).map((j) => EventRegistration.fromJson(j)).toList();
});

// ─── Events Notifier ─────────────────────────────────────────────────────────

class EventsNotifier extends AsyncNotifier<List<Event>> {
  @override
  Future<List<Event>> build() async {
    final data = await _api.get('/events');
    return (data as List).map((j) => Event.fromJson(j)).toList();
  }

  Future<void> createEvent(int groupId, Map<String, dynamic> data) async {
    await _api.post('/groups/$groupId/events', data);
    ref.invalidateSelf();
  }

  Future<void> deleteEvent(int eventId) async {
    await _api.delete('/events/$eventId');
    ref.invalidateSelf();
  }

  Future<void> markAttendance(int eventId, int registrationId, String attendance) async {
    await _api.post('/events/$eventId/attendance', {
      'registration_id': registrationId,
      'attendance': attendance,
    });
    ref.invalidate(eventParticipantsProvider(eventId));
  }
}

final eventsNotifierProvider =
    AsyncNotifierProvider<EventsNotifier, List<Event>>(EventsNotifier.new);
