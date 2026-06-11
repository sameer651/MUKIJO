import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../core/session.dart';

final _api = ApiClient();

// ─── Auth State ─────────────────────────────────────────────────────────────

class AuthState {
  final bool isLoggedIn;
  final int userId;
  final String userName;
  final String clubName;

  const AuthState({
    this.isLoggedIn = false,
    this.userId = 0,
    this.userName = '',
    this.clubName = '',
  });

  AuthState copyWith({bool? isLoggedIn, int? userId, String? userName, String? clubName}) =>
      AuthState(
        isLoggedIn: isLoggedIn ?? this.isLoggedIn,
        userId: userId ?? this.userId,
        userName: userName ?? this.userName,
        clubName: clubName ?? this.clubName,
      );
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final loggedIn = await Session.isLoggedIn();
    if (!loggedIn) return const AuthState();
    final userId = await Session.getOwnerId();
    final userName = await Session.getUserName();
    final clubName = await Session.getClubName();
    return AuthState(isLoggedIn: true, userId: userId, userName: userName, clubName: clubName);
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    try {
      final res = await _api.postPublic('/login', {
        'email': email,
        'password': password,
      });
      final userId = res['userId'] as int;
      final userName = res['userName'] as String? ?? '';
      final clubName = res['clubName'] as String? ?? '';
      await Session.save(userId: userId, userName: userName, clubName: clubName);
      state = AsyncData(AuthState(
        isLoggedIn: true,
        userId: userId,
        userName: userName,
        clubName: clubName,
      ));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> register(Map<String, dynamic> data) async {
    state = const AsyncLoading();
    try {
      await _api.postPublic('/register', data);
      state = const AsyncData(AuthState(isLoggedIn: false));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> logout() async {
    await Session.clear();
    state = const AsyncData(AuthState(isLoggedIn: false));
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
