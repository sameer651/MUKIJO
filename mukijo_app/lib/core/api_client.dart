import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:io' show Platform;
import 'session.dart';

class ApiClient {
  // Automatically detects if running on Android Emulator or Windows/iOS Desktop
  static String get baseUrl {
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8001';
      }
    } catch (_) {}
    return 'http://127.0.0.1:8001';
  }

  /// Builds URL with owner_id appended
  Future<Uri> _buildUri(String endpoint, [Map<String, dynamic>? extra]) async {
    final ownerId = await Session.getOwnerId();
    final params = <String, String>{
      'owner_id': ownerId.toString(),
      ...?extra?.map((k, v) => MapEntry(k, v.toString())),
    };

    final separator = endpoint.contains('?') ? '&' : '?';
    final queryString = params.entries
        .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
    return Uri.parse('$baseUrl$endpoint$separator$queryString');
  }

  /// GET request — owner_id auto-appended
  Future<dynamic> get(String endpoint, {Map<String, dynamic>? params}) async {
    final uri = await _buildUri(endpoint, params);
    final response = await http.get(uri).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  /// POST request
  Future<dynamic> post(String endpoint, dynamic body) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  /// PUT request
  Future<dynamic> put(String endpoint, Map<String, dynamic> body, {Map<String, dynamic>? params}) async {
    final uri = await _buildUri(endpoint, params);
    final response = await http.put(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  /// DELETE request
  Future<dynamic> delete(String endpoint, {Map<String, dynamic>? params}) async {
    final uri = await _buildUri(endpoint, params);
    final response = await http.delete(uri).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  /// POST without owner_id (for auth endpoints)
  Future<dynamic> postPublic(String endpoint, Map<String, dynamic> body) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }
    // Try to extract backend error message
    String message = 'Request failed (${response.statusCode})';
    try {
      final body = jsonDecode(response.body);
      message = body['detail'] ?? message;
    } catch (_) {}
    throw ApiException(message, response.statusCode);
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  const ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
