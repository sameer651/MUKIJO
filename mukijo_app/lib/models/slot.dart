class Slot {
  final int id;
  final int venueId;
  final String sport;
  final DateTime startTime;
  final DateTime endTime;
  final int basePrice;
  final int currentPrice;
  final bool isBlocked;

  Slot({
    required this.id,
    required this.venueId,
    required this.sport,
    required this.startTime,
    required this.endTime,
    required this.basePrice,
    required this.currentPrice,
    required this.isBlocked,
  });

  factory Slot.fromJson(Map<String, dynamic> json) {
    return Slot(
      id: json['id'] as int,
      venueId: json['venue_id'] as int,
      sport: json['sport'] as String,
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: DateTime.parse(json['end_time'] as String),
      basePrice: json['base_price'] as int,
      currentPrice: json['current_price'] as int,
      isBlocked: json['is_blocked'] as bool? ?? false,
    );
  }
}
