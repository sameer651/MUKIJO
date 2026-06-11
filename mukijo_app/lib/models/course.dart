class Course {
  final int id;
  final int ownerId;
  final int? groupId;
  final String title;
  final String? code;
  final String category;
  final String? level;
  final String? description;
  final String? instructor;
  final String? startDate;
  final String? endDate;
  final String? schedule;
  final String? location;
  final int capacity;
  final int fee;
  final String status;
  final int registrationCount;
  final int availableSeats;

  Course({
    required this.id,
    required this.ownerId,
    this.groupId,
    required this.title,
    this.code,
    required this.category,
    this.level,
    this.description,
    this.instructor,
    this.startDate,
    this.endDate,
    this.schedule,
    this.location,
    required this.capacity,
    required this.fee,
    required this.status,
    required this.registrationCount,
    required this.availableSeats,
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id'] as int,
      ownerId: json['owner_id'] as int,
      groupId: json['group_id'] as int?,
      title: json['title'] as String,
      code: json['code'] as String?,
      category: json['category'] ?? 'Training',
      level: json['level'] as String?,
      description: json['description'] as String?,
      instructor: json['instructor'] as String?,
      startDate: json['start_date'] as String?,
      endDate: json['end_date'] as String?,
      schedule: json['schedule'] as String?,
      location: json['location'] as String?,
      capacity: json['capacity'] as int? ?? 0,
      fee: json['fee'] as int? ?? 0,
      status: json['status'] ?? 'open',
      registrationCount: json['registration_count'] as int? ?? 0,
      availableSeats: json['available_seats'] as int? ?? 0,
    );
  }
}
