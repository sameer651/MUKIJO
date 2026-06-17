import 'dart:convert';

class Venue {
  final int id;
  final int ownerId;
  final String name;
  final String location;
  final double? latitude;
  final double? longitude;
  final List<String> sportsSupported;
  final List<String> amenities;
  final double rating;

  Venue({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.location,
    this.latitude,
    this.longitude,
    required this.sportsSupported,
    required this.amenities,
    required this.rating,
  });

  factory Venue.fromJson(Map<String, dynamic> json) {
    List<String> parseJsonList(dynamic val) {
      if (val == null) return [];
      if (val is List) return val.map((e) => e.toString()).toList();
      if (val is String) {
        try {
          final decoded = jsonDecode(val);
          if (decoded is List) return decoded.map((e) => e.toString()).toList();
        } catch (_) {}
      }
      return [];
    }

    return Venue(
      id: json['id'] as int,
      ownerId: json['owner_id'] as int,
      name: json['name'] as String,
      location: json['location'] as String,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      sportsSupported: parseJsonList(json['sports_supported']),
      amenities: parseJsonList(json['amenities']),
      rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
    );
  }
}
