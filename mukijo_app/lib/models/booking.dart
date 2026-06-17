class Booking {
  final int id;
  final int userId;
  final int slotId;
  final DateTime bookingDate;
  final String status;
  final int amountPaid;
  final String paymentStatus;

  Booking({
    required this.id,
    required this.userId,
    required this.slotId,
    required this.bookingDate,
    required this.status,
    required this.amountPaid,
    required this.paymentStatus,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      slotId: json['slot_id'] as int,
      bookingDate: DateTime.parse(json['booking_date'] as String),
      status: json['status'] as String? ?? 'reserved',
      amountPaid: json['amount_paid'] as int? ?? 0,
      paymentStatus: json['payment_status'] as String? ?? 'pending',
    );
  }
}
