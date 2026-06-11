import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/group.dart';
import '../models/member.dart';

final _api = ApiClient();

// ─── Groups ─────────────────────────────────────────────────────────────────

final groupsProvider = FutureProvider<List<Group>>((ref) async {
  final data = await _api.get('/groups');
  return (data as List).map((j) => Group.fromJson(j)).toList();
});

// ─── Members of a specific group ────────────────────────────────────────────

final groupMembersProvider = FutureProvider.family<List<Member>, int>((ref, groupId) async {
  final data = await _api.get('/groups/$groupId/members');
  return (data as List).map((j) => Member.fromJson(j)).toList();
});

// ─── All members across all groups ───────────────────────────────────────────

final allMembersProvider = FutureProvider<List<Member>>((ref) async {
  final data = await _api.get('/members');
  return (data as List).map((j) => Member.fromJson(j)).toList();
});

// ─── Group CRUD Notifier ─────────────────────────────────────────────────────

class GroupsNotifier extends AsyncNotifier<List<Group>> {
  @override
  Future<List<Group>> build() async {
    final data = await _api.get('/groups');
    return (data as List).map((j) => Group.fromJson(j)).toList();
  }

  Future<void> createGroup(Map<String, dynamic> data) async {
    await _api.post('/groups', data);
    ref.invalidateSelf();
  }

  Future<void> deleteGroup(int groupId) async {
    await _api.delete('/groups/$groupId');
    ref.invalidateSelf();
  }

  Future<void> addMember(int groupId, Map<String, dynamic> data) async {
    await _api.post('/groups/$groupId/members', data);
    ref.invalidate(groupMembersProvider(groupId));
  }
}

final groupsNotifierProvider =
    AsyncNotifierProvider<GroupsNotifier, List<Group>>(GroupsNotifier.new);
