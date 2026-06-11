import 'package:shared_preferences/shared_preferences.dart';

class Session {
  static const _keyUserId = 'user_id';
  static const _keyUserName = 'user_name';
  static const _keyClubName = 'club_name';

  /// Save session after login
  static Future<void> save({
    required int userId,
    required String userName,
    required String clubName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyUserId, userId);
    await prefs.setString(_keyUserName, userName);
    await prefs.setString(_keyClubName, clubName);
  }

  /// Get the logged-in owner's id (0 if not logged in)
  static Future<int> getOwnerId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_keyUserId) ?? 0;
  }

  /// Get the user's display name
  static Future<String> getUserName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyUserName) ?? '';
  }

  /// Get the club name
  static Future<String> getClubName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyClubName) ?? 'My Club';
  }

  /// Check if a session is active
  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getInt(_keyUserId);
    return id != null && id > 0;
  }

  /// Clear session on logout
  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyUserName);
    await prefs.remove(_keyClubName);
  }
}
